import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

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
  type: z.enum(["RESTAURANT", "MARKET"]),
  catalogEngine: z.enum(["RESTAURANT", "MARKETPLACE"]),
  description: z.string().trim().min(10),
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
  coverUrl: nullableUrl,
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
  if (!parsed.success)
    return NextResponse.json({ error: "Invalid store data" }, { status: 400 });

  const data = parsed.data;
  const common = {
    name: data.name,
    type: data.type,
    catalogEngine: data.catalogEngine,
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
    coverUrl: data.coverUrl ?? null,
  };

  if (data.id) {
    const existing = await db.store.findUnique({ where: { id: data.id } });
    if (!existing)
      return NextResponse.json({ error: "Store not found" }, { status: 404 });

    const store = await db.store.update({
      where: { id: data.id },
      data: common,
      include: { _count: { select: { products: true, orders: true } } },
    });

    if (data.catalogEngine === "RESTAURANT") {
      await db.restaurantProfile.upsert({
        where: { storeId: store.id },
        update: {},
        create: { storeId: store.id, acceptsSpecialInstructions: true },
      });
    } else {
      await db.marketplaceProfile.upsert({
        where: { storeId: store.id },
        update: {},
        create: { storeId: store.id, tracksInventory: true },
      });
    }

    revalidatePath("/admin");
    revalidatePath("/admin/stores");
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

  if (data.catalogEngine === "RESTAURANT") {
    await db.restaurantProfile.create({
      data: { storeId: store.id, acceptsSpecialInstructions: true },
    });
  } else {
    await db.marketplaceProfile.create({
      data: { storeId: store.id, tracksInventory: true },
    });
  }

  revalidatePath("/admin");
  revalidatePath("/admin/stores");
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
    select: { id: true, slug: true },
  });
  if (!store)
    return NextResponse.json({ error: "Store not found" }, { status: 404 });

  await db.store.delete({ where: { id: parsed.data.id } });
  revalidatePath("/admin");
  revalidatePath("/admin/stores");
  revalidatePath("/stores");
  revalidatePath(`/stores/${store.slug}`);
  return NextResponse.json({ ok: true });
}
