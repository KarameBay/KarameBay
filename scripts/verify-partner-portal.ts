import assert from "node:assert/strict";
import { createHmac, randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const db = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? "http://127.0.0.1:3105";
const schema = new URL(
  process.env.DATABASE_URL ?? "postgresql://invalid",
).searchParams.get("schema");
if (
  !schema?.startsWith("partner_check_") ||
  !/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(base)
)
  throw new Error(
    "Use an isolated partner_check_ database schema and a local test server.",
  );
const marker = `partner-check-${Date.now()}`;
const password = `Partner9${randomBytes(16).toString("hex")}`;
let sequence = 1;
const accounts: string[] = [];
const storeIds: string[] = [];
const typeIds: string[] = [];

async function request(path: string, cookie = "", data?: unknown) {
  const response = await fetch(base + path, {
    method: data === undefined ? "GET" : "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
      cookie,
      "x-forwarded-for": `198.51.${Math.floor(sequence / 250)}.${sequence++ % 250}`,
    },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const text = await response.text();
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    body = { html: text };
  }
  return {
    response,
    body,
    cookie: response.headers
      .getSetCookie()
      .map((v) => v.split(";")[0])
      .join("; "),
  };
}
async function register(index: number, partner = true) {
  const email = `${marker}-${index}@example.invalid`;
  const result = await request("/api/auth/register", "", {
    fullName: "Partner Test",
    email,
    phone: `+250790${String(Date.now() + index).slice(-6)}`,
    password,
    confirmPassword: password,
    accountType: partner ? "partner" : "customer",
    role: "ADMIN",
    status: "ACTIVE",
    emailVerifiedAt: new Date().toISOString(),
  });
  assert.equal(result.response.status, 201, JSON.stringify(result.body));
  const user = await db.user.findUniqueOrThrow({ where: { email } });
  accounts.push(user.id);
  assert.equal(user.role, partner ? "PARTNER" : "CUSTOMER");
  assert.equal(user.emailVerifiedAt, null);
  assert.match(
    result.cookie,
    partner ? /karame_partner_session=/ : /karame_customer_session=/,
  );
  return { user, cookie: result.cookie };
}
async function verify(userId: string, cookie: string) {
  const code = "123456";
  await db.emailVerificationChallenge.update({
    where: { userId },
    data: {
      codeHash: createHmac("sha256", process.env.AUTH_SECRET!)
        .update(`${userId}:${code}`)
        .digest("hex"),
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  const result = await request("/api/auth/verify-email?role=PARTNER", cookie, {
    code,
  });
  assert.equal(result.response.status, 200, JSON.stringify(result.body));
  assert.equal(result.body.redirectTo, "/partner");
}
async function main() {
  const types = await Promise.all(
    ["RETAIL", "RESTAURANT"].map((commerceEngine) =>
      db.storeType.create({
        data: {
          name: `${marker}-${commerceEngine}`,
          slug: `${marker}-${commerceEngine.toLowerCase()}`,
          customerSectionName: "Partner tests",
          description: "Integration test",
          commerceEngine,
          stockTrackingRequired: commerceEngine === "RETAIL",
        },
      }),
    ),
  );
  typeIds.push(...types.map((t) => t.id));
  const a = await register(1);
  const b = await register(2);
  const customer = await register(3, false);
  const storeInput = {
    name: "Partner Test Shop",
    storeTypeId: types[0].id,
    description: "Fresh products from our test shop.",
    phone: "+250788123456",
    address: "Kigali test address",
    latitude: -1.9441,
    longitude: 30.0619,
    opensAt: "00:00",
    closesAt: "23:59",
    isOpen: true,
    status: "APPROVED",
    ownerId: b.user.id,
  };
  assert.equal(
    (await request("/api/partner/stores", a.cookie, storeInput)).response
      .status,
    401,
    "Unverified partner must not create stores",
  );
  await verify(a.user.id, a.cookie);
  await verify(b.user.id, b.cookie);
  assert.equal(
    (await request("/api/partner/products?storeId=unknown")).response.status,
    401,
  );
  assert.equal(
    (await request("/api/partner/stores", customer.cookie, storeInput)).response
      .status,
    401,
  );
  const created = await request("/api/partner/stores", a.cookie, storeInput);
  assert.equal(created.response.status, 200, JSON.stringify(created.body));
  storeIds.push(created.body.id);
  const shop = await db.store.findUniqueOrThrow({
    where: { id: created.body.id },
  });
  assert.equal(shop.ownerId, a.user.id);
  assert.equal(shop.status, "PENDING", "Partner cannot self-approve");
  const other = await request("/api/partner/stores", b.cookie, {
    ...storeInput,
    name: "Other Partner Shop",
  });
  assert.equal(other.response.status, 200);
  storeIds.push(other.body.id);
  const foreignCategory = await db.marketplaceCategory.findFirstOrThrow({
    where: { department: { storeId: other.body.id } },
  });
  const category = await db.marketplaceCategory.findFirstOrThrow({
    where: { department: { storeId: shop.id } },
  });
  const product = {
    storeId: shop.id,
    name: `${marker} Apples`,
    categoryId: category.id,
    priceRwf: 1500,
    stockQuantity: 15,
    isAvailable: true,
    unitLabel: "1 kg",
  };
  assert.equal(
    (
      await request("/api/partner/products", a.cookie, {
        ...product,
        categoryId: foreignCategory.id,
      })
    ).response.status,
    400,
    "Category must belong to store",
  );
  assert.equal(
    (await request("/api/partner/products", b.cookie, product)).response.status,
    404,
    "Cannot create in another partner's shop",
  );
  assert.equal(
    (await request(`/api/partner/products?storeId=${shop.id}`, b.cookie))
      .response.status,
    404,
    "Cannot read another partner's products",
  );
  assert.equal(
    (
      await request("/api/partner/stores", b.cookie, {
        ...storeInput,
        id: shop.id,
      })
    ).response.status,
    404,
    "Cannot edit another partner's store",
  );
  assert.equal(
    (
      await request("/api/partner/products", a.cookie, {
        ...product,
        name: "Gilbey’s Special Dry Gin",
      })
    ).response.status,
    400,
    "Recalled product blocked",
  );
  assert.equal(
    (await request("/api/partner/products", a.cookie, product)).response.status,
    200,
  );
  const listing = await db.marketplaceProduct.findFirstOrThrow({
    where: { storeId: shop.id },
  });
  assert.equal(
    (
      await request("/api/partner/products", b.cookie, {
        ...product,
        storeId: other.body.id,
        id: listing.id,
      })
    ).response.status,
    404,
    "Cannot move another partner's product",
  );
  assert.equal(
    (
      await request("/api/partner/products", b.cookie, {
        storeId: other.body.id,
        id: listing.id,
        action: "delete",
      })
    ).response.status,
    404,
    "Cannot delete another partner's product",
  );
  assert.equal(
    (await request(`/api/catalog/suggestions?q=${encodeURIComponent(marker)}`))
      .body.suggestions.length,
    0,
    "Pending store is hidden",
  );
  const admin = await db.user.create({
    data: {
      email: `${marker}-admin@example.invalid`,
      phone: "+250790000001",
      firstName: "Test",
      lastName: "Admin",
      passwordHash: await hash(password, 10),
      role: "ADMIN",
    },
  });
  accounts.push(admin.id);
  const adminLogin = await request("/api/auth/login", "", {
    email: admin.email,
    password,
    audience: "staff",
    portal: "admin",
  });
  assert.equal(adminLogin.response.status, 200);
  assert.equal(
    (
      await request("/api/admin/partners", a.cookie, {
        storeId: shop.id,
        status: "APPROVED",
      })
    ).response.status,
    401,
    "Partner has no approval rights",
  );
  assert.equal(
    (
      await request("/api/admin/partners", adminLogin.cookie, {
        storeId: shop.id,
        status: "APPROVED",
      })
    ).response.status,
    200,
  );
  assert.equal(
    (await db.store.findUniqueOrThrow({ where: { id: shop.id } })).status,
    "APPROVED",
  );
  const suggestions = await request(
    `/api/catalog/suggestions?q=${encodeURIComponent(marker)}`,
  );
  assert.ok(
    suggestions.body.suggestions.some(
      (s: { label: string }) =>
        s.label?.includes("Apples") || JSON.stringify(s).includes("Apples"),
    ),
    "Approved product appears to customers",
  );
  const adminCatalog = await request(
    `/api/admin/marketplace-catalog?storeId=${shop.id}`,
    adminLogin.cookie,
  );
  assert.ok(
    adminCatalog.body.products.some((p: { id: string }) => p.id === listing.id),
    "Admin retains access to partner listings",
  );
  assert.equal(
    (
      await request(
        `/api/admin/marketplace-catalog?storeId=${shop.id}`,
        a.cookie,
      )
    ).response.status,
    401,
  );
  assert.equal(
    (
      await request("/api/partner/products", a.cookie, {
        ...product,
        id: listing.id,
        priceRwf: 1800,
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await db.marketplaceProductUnit.findFirstOrThrow({
        where: { productId: listing.id },
      })
    ).priceRwf,
    1800,
  );
  const restaurant = await request("/api/partner/stores", a.cookie, {
    ...storeInput,
    name: "Partner Test Kitchen",
    storeTypeId: types[1].id,
  });
  assert.equal(restaurant.response.status, 200);
  storeIds.push(restaurant.body.id);
  const meal = {
    storeId: restaurant.body.id,
    name: "Lunch plate",
    categoryName: "Lunch",
    priceRwf: 5000,
    isAvailable: true,
  };
  assert.equal(
    (await request("/api/partner/products", a.cookie, meal)).response.status,
    200,
  );
  const menu = await request(
    `/api/partner/products?storeId=${restaurant.body.id}`,
    a.cookie,
  );
  assert.equal(menu.body.products[0].name, "Lunch plate");
  assert.equal(
    (
      await request("/api/partner/products", a.cookie, {
        ...meal,
        id: menu.body.products[0].id,
        priceRwf: 5500,
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await request("/api/partner/products", a.cookie, {
        storeId: restaurant.body.id,
        id: menu.body.products[0].id,
        action: "delete",
      })
    ).response.status,
    200,
  );
  for (const portal of ["customer", "admin", "rider"]) {
    assert.equal(
      (
        await request("/api/auth/login", "", {
          email: a.user.email,
          password,
          audience: portal === "customer" ? "customer" : "staff",
          portal,
        })
      ).response.status,
      403,
    );
  }
  const partnerLogin = await request("/api/auth/login", "", {
    email: a.user.email,
    password,
    audience: "partner",
    portal: "partner",
  });
  assert.equal(partnerLogin.response.status, 200);
  assert.match(partnerLogin.cookie, /karame_partner_session=/);
  const combined = partnerLogin.cookie + "; " + adminLogin.cookie;
  assert.equal(
    (await request("/api/auth/me?role=ADMIN", combined)).body.user.id,
    admin.id,
  );
  assert.equal(
    (await request("/api/auth/me?role=PARTNER", combined)).body.user.id,
    a.user.id,
  );
  assert.equal((await request("/partner", a.cookie)).response.status, 200);
  assert.equal(
    (await request("/admin/partners", adminLogin.cookie)).response.status,
    200,
  );
  assert.equal(
    (await request("/partner", customer.cookie)).response.status,
    307,
  );
  assert.equal(
    (
      await request("/api/admin/partners", adminLogin.cookie, {
        storeId: shop.id,
        status: "SUSPENDED",
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await request("/api/partner/products", a.cookie, {
        ...product,
        id: listing.id,
      })
    ).response.status,
    403,
    "Suspended stores cannot publish",
  );
  await request("/api/admin/partners", adminLogin.cookie, {
    storeId: shop.id,
    status: "APPROVED",
  });
  assert.equal(
    (
      await request("/api/partner/products", a.cookie, {
        storeId: shop.id,
        id: listing.id,
        action: "delete",
      })
    ).response.status,
    200,
  );
  assert.equal(
    await db.marketplaceProduct.count({ where: { id: listing.id } }),
    0,
  );
  assert.equal(
    (
      await request("/api/auth/forgot-password?role=PARTNER", "", {
        email: a.user.email,
      })
    ).response.status,
    200,
  );
  const resetCode = "654321";
  await db.passwordResetChallenge.update({
    where: { userId: a.user.id },
    data: {
      codeHash: createHmac("sha256", process.env.AUTH_SECRET!)
        .update(`password-reset:${a.user.id}:${resetCode}`)
        .digest("hex"),
      expiresAt: new Date(Date.now() + 600_000),
    },
  });
  assert.equal(
    (
      await request("/api/auth/verify-reset-code?role=PARTNER", "", {
        email: a.user.email,
        code: resetCode,
      })
    ).response.status,
    200,
  );
  assert.equal(
    (
      await request("/api/auth/verify-reset-code", "", {
        email: a.user.email,
        code: resetCode,
      })
    ).response.status,
    400,
    "Customer recovery cannot consume partner reset",
  );
  const newPassword = password + "New9";
  const reset = await request("/api/auth/reset-password?role=PARTNER", "", {
    email: a.user.email,
    code: resetCode,
    password: newPassword,
    confirmPassword: newPassword,
  });
  assert.equal(reset.response.status, 200);
  assert.equal(reset.body.redirectTo, "/partner/login");
  assert.equal(
    (await request("/api/auth/me?role=PARTNER", a.cookie)).response.status,
    401,
    "Reset revokes existing partner sessions",
  );
  assert.equal(
    (await request("/api/auth/me?role=ADMIN", combined)).body.user.id,
    admin.id,
  );
  assert.equal(
    (
      await request("/api/auth/login", "", {
        email: a.user.email,
        password: newPassword,
        audience: "partner",
        portal: "partner",
      })
    ).response.status,
    200,
  );
  console.log(
    "PASS: Partner self-registration, email verification, retail and restaurant CRUD, admin approval/shared access, pending-store visibility, recall protection, cross-partner isolation, role-cookie isolation and partner password recovery.",
  );
}
main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.store.deleteMany({ where: { id: { in: storeIds } } });
    await db.user.deleteMany({ where: { id: { in: accounts } } });
    await db.storeType.deleteMany({ where: { id: { in: typeIds } } });
    await db.$disconnect();
  });
