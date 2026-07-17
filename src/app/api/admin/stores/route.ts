import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { catalogEngineFor, legacyStoreTypeValue } from "@/lib/store-types";

const nullableUrl = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .refine(
    (value) =>
      value === null ||
      /^https?:\/\//i.test(value) ||
      /^\/uploads\/(store-logo|store-cover)\/[a-f0-9-]+\.(jpg|png|webp)$/i.test(value),
    { message: "Enter a valid image URL" },
  )
  .optional()
  .nullable();

const storeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2),
  storeTypeId: z.string().trim().min(1),
  description: z.string().trim().min(2),
  phone: z.string().trim().min(5).optional().or(z.literal("")),
  address: z.string().trim().min(3),
  latitude: z.coerce.number(),
  longitude: z.coerce.number(),
  opensAt: z.string().trim().min(3),
  closesAt: z.string().trim().min(3),
  status: z.string().trim().min(3).default("APPROVED"),
  isOpen: z.coerce.boolean().default(true),
  estimatedDeliveryMinutes: z.coerce.number().int().min(5).max(240).default(35),
  preparationMinutes: z.coerce.number().int().min(0).max(240).default(20),
  minimumOrderRwf: z.coerce.number().int().min(0).default(0),
  rating: z.coerce.number().min(0).max(5).default(0),
  logoUrl: nullableUrl,
  logoPublicId: z.string().trim().optional().nullable(),
  coverUrl: nullableUrl,
  coverPublicId: z.string().trim().optional().nullable(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80) || randomUUID().slice(0, 8);
}

async function uniqueSlug(base: string, excludeId?: string) {
  let slug = base;
  let counter = 2;
  while (true) {
    const existing = await db.store.findFirst({
      where: {
        slug,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

async function ensureInternalRetailTaxonomy(storeId: string) {
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

export async function POST(request: Request) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (admin.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );

  const parsed = storeSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => {
        const field = issue.path.join(".") || "store";
        return `${field}: ${issue.message}`;
      })
      .join("; ");
    return NextResponse.json(
      { error: details || "Invalid store data" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const storeType = await db.storeType.findUnique({
    where: { id: data.storeTypeId },
  });
  if (!storeType || (!storeType.isActive && !data.id)) {
    return NextResponse.json(
      { error: "Choose an active store type." },
      { status: 400 },
    );
  }
  const catalogEngine = catalogEngineFor(storeType.commerceEngine);
  const common = {
    name: data.name,
    type: legacyStoreTypeValue(storeType.name),
    storeTypeId: storeType.id,
    catalogEngine,
    description: data.description,
    phone: data.phone || null,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    opensAt: data.opensAt,
    closesAt: data.closesAt,
    status: data.status,
    isOpen: data.isOpen,
    estimatedDeliveryMinutes: data.estimatedDeliveryMinutes,
    preparationMinutes: data.preparationMinutes,
    minimumOrderRwf: data.minimumOrderRwf,
    rating: data.rating,
    logoUrl: data.logoUrl ?? null,
    logoPublicId: data.logoPublicId || null,
    coverUrl: data.coverUrl ?? null,
    coverPublicId: data.coverPublicId || null,
  };

  if (data.id) {
    const existing = await db.store.findUnique({ where: { id: data.id } });
    if (!existing)
      return NextResponse.json({ error: "Store not found" }, { status: 404 });

    if (existing.catalogEngine !== catalogEngine) {
      const [restaurantProducts, retailProducts] = await Promise.all([
        db.restaurantProduct.count({ where: { storeId: existing.id } }),
        db.marketplaceProduct.count({ where: { storeId: existing.id } }),
      ]);
      if (restaurantProducts + retailProducts > 0) {
        return NextResponse.json(
          { error: "Move or remove this store's products before changing its commerce engine." },
          { status: 409 },
        );
      }
    }

    const store = await db.store.update({
      where: { id: data.id },
      data: common,
      include: { _count: { select: { products: true, orders: true } } },
    });

    if (catalogEngine === "RESTAURANT") {
      await db.restaurantProfile.upsert({
        where: { storeId: store.id },
        update: {},
        create: { storeId: store.id, acceptsSpecialInstructions: true },
      });
    } else {
      await db.marketplaceProfile.upsert({
        where: { storeId: store.id },
        update: { tracksInventory: storeType.stockTrackingRequired },
        create: { storeId: store.id, tracksInventory: storeType.stockTrackingRequired },
      });
      if (!storeType.departmentsEnabled) await ensureInternalRetailTaxonomy(store.id);
    }

    revalidatePath("/admin");
    revalidatePath("/admin/stores");
    revalidatePath("/explore");
    revalidatePath(`/explore/${storeType.slug}`);
    revalidatePath("/stores");
    revalidatePath(`/stores/${store.slug}`);
    return NextResponse.json({ ok: true, store });
  }

  const slug = await uniqueSlug(slugify(data.name));
  const store = await db.store.create({
    data: {
      ...common,
      slug,
      ownerId: admin.id,
    },
    include: { _count: { select: { products: true, orders: true } } },
  });

  if (catalogEngine === "RESTAURANT") {
    await db.restaurantProfile.create({
      data: { storeId: store.id, acceptsSpecialInstructions: true },
    });
  } else {
    await db.marketplaceProfile.create({
      data: { storeId: store.id, tracksInventory: storeType.stockTrackingRequired },
    });
    if (!storeType.departmentsEnabled) await ensureInternalRetailTaxonomy(store.id);
  }

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath("/explore");
  revalidatePath(`/explore/${storeType.slug}`);
  revalidatePath("/stores");
  revalidatePath(`/stores/${store.slug}`);
  return NextResponse.json({ ok: true, store });
}

export async function DELETE(request: Request) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (admin.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );

  const parsed = z
    .object({ id: z.string().min(1) })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid store id" }, { status: 400 });

  const store = await db.store.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, slug: true, _count: { select: { orders: true } } },
  });
  if (!store)
    return NextResponse.json({ error: "Store not found" }, { status: 404 });

  let archived = false;
  if (store._count.orders > 0) {
    await db.store.update({
      where: { id: parsed.data.id },
      data: { status: "ARCHIVED", isOpen: false, featured: false },
    });
    archived = true;
  } else {
    try {
      await db.store.delete({ where: { id: parsed.data.id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
        await db.store.update({
          where: { id: parsed.data.id },
          data: { status: "ARCHIVED", isOpen: false, featured: false },
        });
        archived = true;
      } else {
        throw error;
      }
    }
  }
  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath("/explore");
  revalidatePath("/stores");
  revalidatePath(`/stores/${store.slug}`);
  return NextResponse.json({ ok: true, archived });
}
