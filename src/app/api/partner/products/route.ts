import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getVerifiedPartner, isRecalledAlcohol } from "@/lib/partner";
import { normalizeCommodityName } from "@/lib/esoko-importer";

const schema = z.object({
  storeId: z.string().min(1),
  id: z.string().min(1).optional(),
  action: z.enum(["save", "delete"]).default("save"),
  name: z.string().trim().min(2).max(200).optional(),
  description: z.string().trim().max(3000).default(""),
  categoryId: z.string().min(1).optional(),
  categoryName: z.string().trim().min(2).max(100).optional(),
  priceRwf: z.number().int().min(1).max(100_000_000).optional(),
  stockQuantity: z.number().min(0).max(1_000_000).default(0),
  unitLabel: z.string().trim().min(1).max(80).default("Each"),
  imageUrl: z
    .string()
    .max(2048)
    .refine(
      (v) => !v || /^https:\/\//.test(v) || /^\/images\//.test(v),
      "Use a secure image URL",
    )
    .default(""),
  imagePublicId: z.string().max(500).nullable().optional(),
  isAvailable: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const partner = await getVerifiedPartner();
  if (!partner)
    return NextResponse.json(
      { error: "Sign in with a verified partner account." },
      { status: 401 },
    );
  const storeId = request.nextUrl.searchParams.get("storeId") ?? "";
  const store = await db.store.findFirst({
    where: { id: storeId, ownerId: partner.id },
  });
  if (!store)
    return NextResponse.json({ error: "Store not found." }, { status: 404 });
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  const requestedPage = Number(request.nextUrl.searchParams.get("page"));
  const page = Number.isFinite(requestedPage)
    ? Math.min(100_000, Math.max(1, Math.floor(requestedPage) || 1))
    : 1;
  const where = {
    storeId,
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
  };
  if (store.catalogEngine === "RESTAURANT") {
    const [rows, total, categories] = await Promise.all([
      db.restaurantProduct.findMany({
        where,
        include: { category: true },
        take: 24,
        skip: (page - 1) * 24,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      }),
      db.restaurantProduct.count({ where }),
      db.restaurantCategory.findMany({
        where: { storeId },
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return NextResponse.json({
      products: rows.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        categoryId: p.categoryId,
        categoryName: p.category.name,
        priceRwf: p.basePriceRwf,
        imageUrl: p.imageUrl ?? "",
        imagePublicId: p.imagePublicId,
        isAvailable: p.isAvailable,
        stockQuantity: 0,
        unitLabel: "Per item",
      })),
      categories,
      total,
      page,
      pages: Math.max(1, Math.ceil(total / 24)),
    });
  }
  const [rows, total, categories] = await Promise.all([
    db.marketplaceProduct.findMany({
      where,
      include: {
        category: true,
        inventory: true,
        units: { where: { isDefault: true }, take: 1 },
      },
      take: 24,
      skip: (page - 1) * 24,
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
    }),
    db.marketplaceProduct.count({ where }),
    db.marketplaceCategory.findMany({
      where: { department: { storeId } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);
  return NextResponse.json({
    products: rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description ?? "",
      categoryId: p.categoryId,
      categoryName: p.category.name,
      priceRwf: p.units[0]?.priceRwf ?? 0,
      imageUrl: p.imageUrl ?? "",
      imagePublicId: p.imagePublicId,
      isAvailable: p.isAvailable,
      stockQuantity: p.inventory?.stockQuantity ?? 0,
      unitLabel: p.units[0]?.label ?? "Each",
    })),
    categories,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / 24)),
  });
}

export async function POST(request: Request) {
  const partner = await getVerifiedPartner();
  if (!partner)
    return NextResponse.json(
      { error: "Sign in with a verified partner account." },
      { status: 401 },
    );
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Check your product details.",
      },
      { status: 400 },
    );
  const data = parsed.data;
  if (
    data.action === "save" &&
    (!data.name || !data.priceRwf || (!data.categoryId && !data.categoryName))
  )
    return NextResponse.json(
      { error: "Name, category and price are required." },
      { status: 400 },
    );
  if (data.action === "save" && isRecalledAlcohol(data.name!))
    return NextResponse.json(
      {
        error:
          "This alcoholic product was removed following the Rwanda FDA recall and cannot be listed.",
      },
      { status: 400 },
    );
  const outcome = await db.$transaction(
    async (tx) => {
      const store = await tx.store.findFirst({
        where: { id: data.storeId, ownerId: partner.id },
        include: { storeType: true },
      });
      if (!store) return { error: "Store not found.", status: 404 };
      if (
        !["PENDING", "APPROVED"].includes(store.status) ||
        !store.storeType?.isActive
      )
        return {
          error:
            "This store cannot currently change its catalog. Contact Karame Bay.",
          status: 403,
        };
      const restaurant = store.catalogEngine === "RESTAURANT";
      const existing = data.id
        ? restaurant
          ? await tx.restaurantProduct.findFirst({
              where: { id: data.id, storeId: store.id },
            })
          : await tx.marketplaceProduct.findFirst({
              where: { id: data.id, storeId: store.id },
            })
        : null;
      if (data.id && !existing)
        return { error: "Product not found.", status: 404 };
      if (data.action === "delete") {
        if (!data.id) return { error: "Choose a product.", status: 400 };
        if (restaurant)
          await tx.restaurantProduct.delete({
            where: { id: data.id, storeId: store.id },
          });
        else
          await tx.marketplaceProduct.delete({
            where: { id: data.id, storeId: store.id },
          });
      } else if (restaurant) {
        let category = data.categoryId
          ? await tx.restaurantCategory.findFirst({
              where: { id: data.categoryId, storeId: store.id },
            })
          : null;
        if (data.categoryId && !category)
          return { error: "Choose a category from your store.", status: 400 };
        if (!category)
          category = await tx.restaurantCategory.create({
            data: {
              storeId: store.id,
              name: data.categoryName!,
              slug: `category-${randomUUID()}`,
            },
          });
        const values = {
          name: data.name!,
          description: data.description,
          basePriceRwf: data.priceRwf!,
          categoryId: category.id,
          imageUrl: data.imageUrl || null,
          imagePublicId: data.imagePublicId ?? null,
          isAvailable: data.isAvailable,
        };
        if (data.id)
          await tx.restaurantProduct.update({
            where: { id: data.id, storeId: store.id },
            data: values,
          });
        else
          await tx.restaurantProduct.create({
            data: {
              ...values,
              storeId: store.id,
              slug: `product-${randomUUID()}`,
            },
          });
      } else {
        let category = data.categoryId
          ? await tx.marketplaceCategory.findFirst({
              where: { id: data.categoryId, department: { storeId: store.id } },
            })
          : null;
        if (data.categoryId && !category)
          return { error: "Choose a category from your store.", status: 400 };
        if (!category) {
          const department = await tx.marketplaceDepartment.upsert({
            where: { storeId_slug: { storeId: store.id, slug: "catalog" } },
            update: {},
            create: { storeId: store.id, name: "Catalog", slug: "catalog" },
          });
          category = await tx.marketplaceCategory.create({
            data: {
              departmentId: department.id,
              name: data.categoryName!,
              slug: `category-${randomUUID()}`,
            },
          });
        }
        const values = {
          name: data.name!,
          normalizedName: normalizeCommodityName(data.name!),
          description: data.description,
          categoryId: category.id,
          departmentId: category.departmentId,
          imageUrl: data.imageUrl || null,
          imagePublicId: data.imagePublicId ?? null,
          isAvailable: data.isAvailable,
        };
        const product = data.id
          ? await tx.marketplaceProduct.update({
              where: { id: data.id, storeId: store.id },
              data: values,
            })
          : await tx.marketplaceProduct.create({
              data: {
                ...values,
                storeId: store.id,
                slug: `product-${randomUUID()}`,
              },
            });
        const unit = await tx.marketplaceProductUnit.findFirst({
          where: { productId: product.id, isDefault: true },
        });
        const unitValues = {
          priceRwf: data.priceRwf!,
          label: data.unitLabel,
          isAvailable: data.isAvailable,
        };
        if (unit)
          await tx.marketplaceProductUnit.update({
            where: { id: unit.id },
            data: unitValues,
          });
        else
          await tx.marketplaceProductUnit.create({
            data: {
              ...unitValues,
              productId: product.id,
              unitType: "EACH",
              isDefault: true,
            },
          });
        const stockQuantity = store.storeType.stockTrackingRequired
          ? data.stockQuantity
          : 1;
        await tx.marketplaceInventory.upsert({
          where: { productId: product.id },
          update: { stockQuantity },
          create: { productId: product.id, stockQuantity },
        });
      }
      return { slug: store.slug };
    },
    { maxWait: 10_000, timeout: 30_000 },
  );
  if ("error" in outcome)
    return NextResponse.json(
      { error: outcome.error },
      { status: outcome.status },
    );
  for (const path of [
    "/partner",
    "/admin/products",
    "/admin/menus",
    "/stores",
    `/stores/${outcome.slug}`,
  ])
    revalidatePath(path);
  return NextResponse.json({ ok: true });
}
