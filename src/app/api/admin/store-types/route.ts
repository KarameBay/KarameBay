import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { COMMERCE_ENGINES, OPTIONAL_PRODUCT_FIELDS } from "@/lib/store-types";

const nullableImage = z
  .string()
  .trim()
  .max(500)
  .optional()
  .nullable()
  .transform((value) => value || null)
  .refine(
    (value) =>
      value === null ||
      /^https?:\/\//i.test(value) ||
      /^\/uploads\/store-type\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(value),
    "Enter a valid image URL.",
  );

const schema = z.object({
  id: z.string().trim().optional(),
  name: z.string().trim().min(2).max(80),
  customerSectionName: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens."),
  description: z.string().trim().min(5).max(500),
  iconUrl: nullableImage,
  iconPublicId: z.string().trim().optional().nullable(),
  imageUrl: nullableImage,
  imagePublicId: z.string().trim().optional().nullable(),
  displayOrder: z.coerce.number().int().min(0).max(10000),
  isActive: z.boolean(),
  isFeatured: z.boolean(),
  commerceEngine: z.enum(COMMERCE_ENGINES),
  optionalProductFields: z.array(z.enum(OPTIONAL_PRODUCT_FIELDS)).default([]),
  stockTrackingRequired: z.boolean(),
  ageConfirmationRequired: z.boolean(),
  productUnitsEnabled: z.boolean(),
  brandsEnabled: z.boolean(),
  departmentsEnabled: z.boolean(),
});

async function requireAdmin() {
  const user = await getCurrentUser("ADMIN");
  return user?.role === "ADMIN" ? user : null;
}

async function ensureSimpleCatalog(storeId: string) {
  const department = await db.marketplaceDepartment.upsert({
    where: { storeId_slug: { storeId, slug: "catalog" } },
    update: {},
    create: { storeId, slug: "catalog", name: "Catalog", sortOrder: 0 },
  });
  await db.marketplaceCategory.upsert({
    where: { departmentId_slug: { departmentId: department.id, slug: "all-products" } },
    update: {},
    create: { departmentId: department.id, slug: "all-products", name: "All products", sortOrder: 0 },
  });
}

function refreshStoreTypePages() {
  revalidatePath("/admin/stores");
  revalidatePath("/explore");
  revalidatePath("/stores");
  revalidatePath("/restaurants");
  revalidatePath("/markets");
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the store type details." },
      { status: 400 },
    );
  }

  const value = parsed.data;
  const duplicate = await db.storeType.findFirst({
    where: {
      slug: value.slug,
      ...(value.id ? { NOT: { id: value.id } } : {}),
    },
    select: { id: true },
  });
  if (duplicate) {
    return NextResponse.json({ error: "That store type slug is already used." }, { status: 409 });
  }

  if (value.id) {
    const existing = await db.storeType.findUnique({
      where: { id: value.id },
      select: { commerceEngine: true, _count: { select: { stores: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Store type not found." }, { status: 404 });
    }
    if (existing.commerceEngine !== value.commerceEngine && existing._count.stores > 0) {
      return NextResponse.json(
        { error: "Move stores to another type before changing this type's commerce engine." },
        { status: 409 },
      );
    }
  }

  const data = {
    name: value.name,
    customerSectionName: value.customerSectionName,
    slug: value.slug,
    description: value.description,
    iconUrl: value.iconUrl,
    iconPublicId: value.iconPublicId || null,
    imageUrl: value.imageUrl,
    imagePublicId: value.imagePublicId || null,
    displayOrder: value.displayOrder,
    isActive: value.isActive,
    isFeatured: value.isFeatured,
    commerceEngine: value.commerceEngine,
    optionalProductFieldsJson: JSON.stringify(value.optionalProductFields),
    stockTrackingRequired: value.stockTrackingRequired,
    ageConfirmationRequired: value.ageConfirmationRequired,
    productUnitsEnabled: value.productUnitsEnabled,
    brandsEnabled: value.brandsEnabled,
    departmentsEnabled: value.departmentsEnabled,
  };

  const storeType = value.id
    ? await db.storeType.update({ where: { id: value.id }, data })
    : await db.storeType.create({ data });

  if (value.id) {
    await Promise.all([
      db.store.updateMany({
        where: { storeTypeId: storeType.id },
        data: { type: storeType.name.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_").slice(0, 40) || "STORE" },
      }),
      db.marketplaceProfile.updateMany({
        where: { store: { storeTypeId: storeType.id } },
        data: { tracksInventory: storeType.stockTrackingRequired },
      }),
    ]);
    if (storeType.commerceEngine === "RETAIL" && !storeType.departmentsEnabled) {
      const assignedStores = await db.store.findMany({
        where: { storeTypeId: storeType.id },
        select: { id: true },
      });
      await Promise.all(assignedStores.map((store) => ensureSimpleCatalog(store.id)));
    }
  }

  refreshStoreTypePages();
  return NextResponse.json({ ok: true, storeType });
}

export async function DELETE(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Administrator access required." }, { status: 401 });
  }
  const parsed = z.object({ id: z.string().min(1) }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Choose a store type." }, { status: 400 });
  }

  const storeType = await db.storeType.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, _count: { select: { stores: true } } },
  });
  if (!storeType) {
    return NextResponse.json({ error: "Store type not found." }, { status: 404 });
  }
  if (storeType._count.stores > 0) {
    return NextResponse.json(
      { error: "This type is used by stores. Deactivate it or move those stores first." },
      { status: 409 },
    );
  }

  await db.storeType.delete({ where: { id: storeType.id } });
  refreshStoreTypePages();
  return NextResponse.json({ ok: true });
}
