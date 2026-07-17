import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const base = process.env.TEST_BASE_URL ?? "http://localhost:3000";
const testPassword = process.env.TEST_ACCOUNT_PASSWORD;
if (!testPassword) throw new Error("TEST_ACCOUNT_PASSWORD is required.");
let loginSequence = 20;

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

async function request(path: string, options: RequestInit = {}, cookie = "") {
  const response = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "content-type": "application/json" } : {}),
      ...(cookie ? { cookie } : {}),
      ...options.headers,
    },
  });
  const data = await response.json().catch(() => ({}));
  return { response, data };
}

async function login(email: string, portal: "customer" | "admin" | "rider") {
  const audience = portal === "customer" ? "customer" : "staff";
  const { response, data } = await request("/api/auth/login", {
    method: "POST",
    headers: { "x-forwarded-for": `198.51.100.${loginSequence++}` },
    body: JSON.stringify({ email, password: testPassword, audience, portal }),
  });
  check(response.ok, `Login failed for ${email}: ${data.error}`);
  const setCookie = response.headers.get("set-cookie") ?? "";
  const role = data.user?.role as "CUSTOMER" | "ADMIN" | "RIDER";
  const cookieName = {
    CUSTOMER: "karame_customer_session",
    ADMIN: "karame_admin_session",
    RIDER: "karame_rider_session",
  }[role];
  check(cookieName, `Login returned an unsupported role for ${email}`);
  const match = setCookie.match(new RegExp(`${cookieName}=([^;,]+)`));
  const cookie = match ? `${cookieName}=${match[1]}` : "";
  check(cookie.startsWith(`${cookieName}=`), `No isolated session cookie for ${email}`);
  return cookie;
}

async function patch(path: string, cookie: string, body: object) {
  return request(path, { method: "PATCH", body: JSON.stringify(body) }, cookie);
}

async function main() {
  const customerCookie = await login("customer@karamebay.rw", "customer");
  const adminCookie = await login("admin@karamebay.rw", "admin");
  const riderCookie = await login("rider@karamebay.rw", "rider");

  const store = await db.store.findFirstOrThrow({
    where: {
      catalogEngine: "MARKETPLACE",
      marketplaceProducts: { some: { isAvailable: true } },
    },
    orderBy: { createdAt: "desc" },
  });
  const product = await db.marketplaceProduct.findFirstOrThrow({
    where: { storeId: store.id, isAvailable: true },
    include: {
      units: { where: { isDefault: true, isAvailable: true }, take: 1 },
    },
    orderBy: { name: "asc" },
  });
  const unit = product.units[0];
  check(unit, "Marketplace product has no default unit");

  const search = await fetch(
    `${base}/stores?q=${encodeURIComponent(product.name)}`,
  );
  check(search.ok, "Catalog search page failed");
  check(
    (await search.text()).includes(store.name),
    "Product search did not find its store",
  );

  const destination = { latitude: -1.9706, longitude: 30.1044 };
  const route = await request(
    `/api/routing?storeId=${store.id}&customerLat=${destination.latitude}&customerLng=${destination.longitude}`,
  );
  check(route.response.ok, `Routing failed: ${route.data.error}`);
  check(route.data.distanceKm > 0, "Routing returned no driving distance");
  check(route.data.deliveryFeeRwf >= 0, "Routing returned an invalid fee");

  const create = await request(
    "/api/orders",
    {
      method: "POST",
      body: JSON.stringify({
        items: [
          {
            productId: product.id,
            catalogEngine: "MARKETPLACE",
            quantity: 2,
            priceRwf: unit.priceRwf,
          },
        ],
        deliveryLatitude: destination.latitude,
        deliveryLongitude: destination.longitude,
        deliveryAddress: "Phase 1 lifecycle test, Kigali",
        expectedItemsSubtotalRwf: unit.priceRwf * 2,
        expectedDeliveryFeeRwf: route.data.deliveryFeeRwf,
        paymentConfirmed: true,
      }),
    },
    customerCookie,
  );
  check(
    create.response.status === 201,
    `Order creation failed: ${create.data.error}`,
  );
  const orderNumber: string = create.data.order.orderNumber;
  const order = await db.order.findUniqueOrThrow({ where: { orderNumber } });

  const unpaidAccept = await patch(`/api/admin/orders/${order.id}`, adminCookie, {
    action: "UPDATE_STATUS",
    status: "ACCEPTED",
  });
  check(
    !unpaidAccept.response.ok,
    `Admin accepted an unverified payment (HTTP ${unpaidAccept.response.status})`,
  );

  const illegalJump = await patch(
    `/api/admin/orders/${order.id}`,
    adminCookie,
    { action: "UPDATE_STATUS", status: "PICKED_UP" },
  );
  check(
    !illegalJump.response.ok,
    `Admin bypassed the order workflow (HTTP ${illegalJump.response.status})`,
  );

  const verified = await patch(`/api/admin/orders/${order.id}`, adminCookie, {
    action: "VERIFY_PAYMENT",
  });
  check(
    verified.response.ok,
    `Payment verification failed: ${verified.data.error}`,
  );

  for (const status of ["ACCEPTED", "PREPARING", "READY_FOR_PICKUP"]) {
    const result = await patch(`/api/admin/orders/${order.id}`, adminCookie, {
      action: "UPDATE_STATUS",
      status,
    });
    check(
      result.response.ok,
      `Admin status ${status} failed: ${result.data.error}`,
    );
  }

  const beforeAssignment = await request(
    "/api/rider/deliveries",
    {},
    riderCookie,
  );
  check(beforeAssignment.response.ok, "Rider delivery list failed");
  check(
    !beforeAssignment.data.assigned.some(
      (item: { id: string }) => item.id === order.id,
    ),
    "Rider saw an order before the administrator assigned it",
  );

  const rider = await db.user.findUniqueOrThrow({
    where: { email: "rider@karamebay.rw" },
    select: { id: true },
  });
  const assignment = await patch(
    `/api/admin/orders/${order.id}`,
    adminCookie,
    { action: "ASSIGN_RIDER", riderId: rider.id },
  );
  check(
    assignment.response.ok,
    `Manual rider assignment failed: ${assignment.data.error}`,
  );

  const assigned = await request("/api/rider/deliveries", {}, riderCookie);
  check(assigned.response.ok, "Assigned rider delivery list failed");
  check(
    !assigned.data.assigned.some((item: { id: string }) => item.id === order.id),
    "Unaccepted assignment appeared in the rider active list",
  );
  check(
    assigned.data.available.some((item: { id: string }) => item.id === order.id),
    "Unaccepted assignment did not appear in the rider Accept list",
  );

  const riderUpdateBeforeAcceptance = await patch(
    `/api/rider/deliveries/${order.id}`,
    riderCookie,
    { action: "UPDATE_STATUS", status: "PICKED_UP" },
  );
  check(
    riderUpdateBeforeAcceptance.response.status === 409,
    "Rider changed delivery status before accepting the assignment",
  );

  const accepted = await patch(
    `/api/rider/deliveries/${order.id}`,
    riderCookie,
    { action: "ACCEPT" },
  );
  check(
    accepted.response.ok,
    `Rider acceptance failed: ${accepted.data.error}`,
  );
  check(
    accepted.data.delivery.assignmentStatus === "ACKNOWLEDGED",
    "Rider acceptance did not acknowledge the admin assignment",
  );

  const afterAcceptance = await request(
    "/api/rider/deliveries",
    {},
    riderCookie,
  );
  check(
    !afterAcceptance.data.available.some(
      (item: { id: string }) => item.id === order.id,
    ),
    "Accepted delivery remained in the rider Accept list",
  );
  check(
    afterAcceptance.data.assigned.some(
      (item: { id: string; assignmentStatus: string | null }) =>
        item.id === order.id && item.assignmentStatus === "ACKNOWLEDGED",
    ),
    "Accepted delivery did not move to the rider active list",
  );

  const adminUpdateAfterAcceptance = await patch(
    `/api/admin/orders/${order.id}`,
    adminCookie,
    { action: "UPDATE_STATUS", status: "PICKED_UP" },
  );
  check(
    adminUpdateAfterAcceptance.response.status === 409,
    "Admin changed delivery status after the rider accepted it",
  );

  for (const status of ["PICKED_UP", "ON_THE_WAY", "DELIVERED"]) {
    const result = await patch(
      `/api/rider/deliveries/${order.id}`,
      riderCookie,
      { action: "UPDATE_STATUS", status },
    );
    check(
      result.response.ok,
      `Rider status ${status} failed: ${result.data.error}`,
    );
  }

  const tracking = await request(
    `/api/orders/${orderNumber}`,
    { cache: "no-store" },
    customerCookie,
  );
  check(tracking.response.ok, "Customer tracking API failed");
  check(
    tracking.data.order.status === "DELIVERED",
    "Customer did not see delivery completion",
  );

  const final = await db.order.findUniqueOrThrow({
    where: { id: order.id },
    include: { payment: true, events: true, notifications: true },
  });
  check(final.riderId, "Delivered order has no rider");
  check(final.payment?.status === "PAID", "Delivered order is not paid");
  check(
    final.payment?.verifiedById,
    "Payment verifier relationship is missing",
  );
  check(
    final.events.every((event) => event.actorId),
    "A lifecycle event has no actor",
  );
  check(
    final.grandTotalRwf === final.itemsSubtotalRwf + final.deliveryFeeRwf,
    "Order total is inconsistent",
  );
  check(
    final.notifications.length >= 6,
    "Customer lifecycle notifications are incomplete",
  );
  check(
    final.notifications.every((notification) => !notification.readAt),
    "A new notification was unexpectedly marked read",
  );

  console.log(
    JSON.stringify(
      {
        orderNumber,
        status: final.status,
        payment: final.payment.status,
        routedDistanceKm: route.data.distanceKm,
        deliveryFeeRwf: final.deliveryFeeRwf,
        events: final.events.length,
        notifications: final.notifications.length,
        result: "PASS",
      },
      null,
      2,
    ),
  );

  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});
