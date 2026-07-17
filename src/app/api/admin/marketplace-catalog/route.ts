import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { normalizeCommodityName } from "@/lib/esoko-importer";
import { DEFAULT_MARKET_IMAGE } from "@/lib/product-images";
import { parseOptionalProductFields } from "@/lib/store-types";

const PAGE_SIZE = 24;
const containsInsensitive = (term: string) => ({
  contains: term,
  mode: Prisma.QueryMode.insensitive,
});

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80) || randomUUID().slice(0, 8)
  );
}

async function requireAdmin() {
  const user = await getCurrentUser("ADMIN");
  return user?.role === "ADMIN" ? user : null;
}

async function uniqueProductSlug(storeId: string, name: string, excludeId?: string) {
  const base = slugify(name);
  let candidate = base;
  let suffix = 2;
  while (
    await db.marketplaceProduct.findFirst({
      where: {
        storeId,
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${suffix++}`;
  }
  return candidate;
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const storeId = request.nextUrl.searchParams.get("storeId") ?? "";
  const search = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const page = Math.max(1, Number(request.nextUrl.searchParams.get("page")) || 1);
  const store = await db.store.findFirst({
    where: { id: storeId, catalogEngine: "MARKETPLACE" },
    select: { id: true, storeType: true },
  });
  if (!store)
    return NextResponse.json({ error: "Retail store not found" }, { status: 404 });

  const where: Prisma.MarketplaceProductWhereInput = {
    storeId,
    ...(search
      ? {
          OR: [
            { name: containsInsensitive(search) },
            { sku: containsInsensitive(search) },
            { brand: containsInsensitive(search) },
            { category: { name: containsInsensitive(search) } },
          ],
        }
      : {}),
  };
  const [products, total] = await Promise.all([
    db.marketplaceProduct.findMany({
      where,
      include: {
        department: { select: { id: true, name: true } },
        category: { select: { id: true, name: true } },
        units: { orderBy: [{ isDefault: "desc" }, { label: "asc" }] },
        inventory: true,
      },
      orderBy: [{ updatedAt: "desc" }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    db.marketplaceProduct.count({ where }),
  ]);

  return NextResponse.json({
    products,
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  });
}

const baseSchema = z.object({
  entity: z.enum(["department", "category", "product"]),
  action: z.enum(["save", "delete"]),
  id: z.string().optional(),
});

export async function POST(request: NextRequest) {
  if (!(await requireAdmin()))
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });

  const raw = await request.json().catch(() => ({}));
  const base = baseSchema.safeParse(raw);
  if (!base.success)
    return NextResponse.json({ error: "Invalid catalog request" }, { status: 400 });

  if (base.data.entity === "department") {
    const input = z
      .object({
        entity: z.literal("department"),
        action: z.enum(["save", "delete"]),
        id: z.string().optional(),
        storeId: z.string().optional(),
        name: z.string().trim().min(2).optional(),
        description: z.string().trim().optional(),
      })
      .safeParse(raw);
    if (!input.success)
      return NextResponse.json({ error: "Check the department details" }, { status: 400 });
    if (input.data.action === "delete") {
      if (!input.data.id)
        return NextResponse.json({ error: "Department is required" }, { status: 400 });
      const used = await db.marketplaceDepartment.findUnique({
        where: { id: input.data.id },
        select: { _count: { select: { categories: true, products: true } } },
      });
      if (!used) return NextResponse.json({ error: "Department not found" }, { status: 404 });
      if (used._count.categories || used._count.products)
        return NextResponse.json(
          { error: "Remove the department's categories and products first." },
          { status: 409 },
        );
      await db.marketplaceDepartment.delete({ where: { id: input.data.id } });
    } else {
      if (!input.data.storeId || !input.data.name)
        return NextResponse.json({ error: "Market and department name are required" }, { status: 400 });
      const store = await db.store.findFirst({
        where: { id: input.data.storeId, catalogEngine: "MARKETPLACE" },
        select: { id: true, storeType: { select: { departmentsEnabled: true } } },
      });
      if (!store) return NextResponse.json({ error: "Retail store not found" }, { status: 404 });
      if (store.storeType && !store.storeType.departmentsEnabled)
        return NextResponse.json({ error: "Departments are disabled for this store type." }, { status: 409 });
      const duplicate = await db.marketplaceDepartment.findFirst({
        where: {
          storeId: store.id,
          slug: slugify(input.data.name),
          ...(input.data.id ? { NOT: { id: input.data.id } } : {}),
        },
        select: { id: true },
      });
      if (duplicate)
        return NextResponse.json({ error: "That department already exists" }, { status: 409 });
      const data = {
        storeId: store.id,
        name: input.data.name,
        slug: slugify(input.data.name),
        description: input.data.description || null,
      };
      if (input.data.id)
        await db.marketplaceDepartment.update({ where: { id: input.data.id }, data });
      else await db.marketplaceDepartment.create({ data });
    }
  }

  if (base.data.entity === "category") {
    const input = z
      .object({
        entity: z.literal("category"),
        action: z.enum(["save", "delete"]),
        id: z.string().optional(),
        storeId: z.string().optional(),
        departmentId: z.string().optional(),
        name: z.string().trim().min(2).optional(),
        description: z.string().trim().optional(),
      })
      .safeParse(raw);
    if (!input.success)
      return NextResponse.json({ error: "Check the category details" }, { status: 400 });
    if (input.data.action === "delete") {
      if (!input.data.id)
        return NextResponse.json({ error: "Category is required" }, { status: 400 });
      const used = await db.marketplaceCategory.findUnique({
        where: { id: input.data.id },
        select: { _count: { select: { products: true, children: true } } },
      });
      if (!used) return NextResponse.json({ error: "Category not found" }, { status: 404 });
      if (used._count.products || used._count.children)
        return NextResponse.json(
          { error: "Move or delete products in this category first." },
          { status: 409 },
        );
      await db.marketplaceCategory.delete({ where: { id: input.data.id } });
    } else {
      if (!input.data.name)
        return NextResponse.json({ error: "Category name is required" }, { status: 400 });
      let departmentId = input.data.departmentId;
      if (!departmentId && input.data.storeId) {
        const department = await db.marketplaceDepartment.findFirst({
          where: { storeId: input.data.storeId },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true },
        });
        departmentId = department?.id;
      }
      if (!departmentId)
        return NextResponse.json({ error: "Department is required for this category." }, { status: 400 });
      const department = await db.marketplaceDepartment.findUnique({
        where: { id: departmentId },
        select: { id: true },
      });
      if (!department)
        return NextResponse.json({ error: "Department not found" }, { status: 404 });
      const data = {
        departmentId: department.id,
        name: input.data.name,
        slug: slugify(input.data.name),
        description: input.data.description || null,
      };
      try {
        if (input.data.id)
          await db.marketplaceCategory.update({ where: { id: input.data.id }, data });
        else await db.marketplaceCategory.create({ data });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
          return NextResponse.json({ error: "That category already exists" }, { status: 409 });
        throw error;
      }
    }
  }

  if (base.data.entity === "product") {
    const input = z
      .object({
        entity: z.literal("product"),
        action: z.enum(["save", "delete"]),
        id: z.string().optional(),
        storeId: z.string().optional(),
        departmentId: z.string().optional(),
        categoryId: z.string().optional(),
        name: z.string().trim().min(2).optional(),
        description: z.string().trim().optional(),
        brand: z.string().trim().optional(),
        sku: z.string().trim().optional(),
        imageUrl: z.string().trim().optional(),
        imagePublicId: z.string().trim().optional(),
        containerChargePerUnitRwf: z.coerce.number().int().min(0).default(0),
        containerChargeFlatRwf: z.coerce.number().int().min(0).default(0),
        unitLabel: z.string().trim().min(1).default("Each"),
        unitType: z.string().trim().min(1).default("EACH"),
        priceRwf: z.coerce.number().int().min(0).default(0),
        stockQuantity: z.coerce.number().min(0).default(0),
        isAvailable: z.boolean().default(true),
        featured: z.boolean().default(false),
      })
      .safeParse(raw);
    if (!input.success)
      return NextResponse.json({ error: "Check the product details" }, { status: 400 });
    if (input.data.action === "delete") {
      if (!input.data.id)
        return NextResponse.json({ error: "Product is required" }, { status: 400 });
      await db.$transaction(async (tx) => {
        await tx.orderItem.updateMany({
          where: { marketplaceProductId: input.data.id },
          data: { marketplaceProductId: null },
        });
        await tx.marketplaceProduct.delete({ where: { id: input.data.id } });
      });
    } else {
      const value = input.data;
      if (!value.storeId || !value.categoryId || !value.name)
        return NextResponse.json(
          { error: "Market, category, and product name are required" },
          { status: 400 },
        );
      const store = await db.store.findFirst({
        where: { id: value.storeId, catalogEngine: "MARKETPLACE" },
        select: { id: true, storeType: true },
      });
      if (!store)
        return NextResponse.json({ error: "Retail store not found" }, { status: 404 });
      const category = await db.marketplaceCategory.findFirst({
        where: {
          id: value.categoryId,
          ...(value.departmentId ? { departmentId: value.departmentId } : {}),
          department: { storeId: value.storeId },
        },
        select: { id: true, departmentId: true },
      });
      if (!category)
        return NextResponse.json({ error: "Choose a category from this market" }, { status: 400 });
      const capabilities = store.storeType;
      const optionalFields = parseOptionalProductFields(capabilities?.optionalProductFieldsJson);
      const slug = await uniqueProductSlug(store.id, value.name, value.id);
      await db.$transaction(async (tx) => {
        const productData = {
          storeId: store.id,
          departmentId: category.departmentId,
          categoryId: value.categoryId!,
          slug,
          name: value.name!,
          normalizedName: normalizeCommodityName(value.name!),
          description: optionalFields.includes("description") ? value.description || null : null,
          brand: capabilities?.brandsEnabled ? value.brand || null : null,
          sku: optionalFields.includes("sku") ? value.sku || null : null,
          imageUrl: optionalFields.includes("image") ? value.imageUrl || DEFAULT_MARKET_IMAGE : DEFAULT_MARKET_IMAGE,
          imagePublicId: optionalFields.includes("image") ? value.imagePublicId || null : null,
          containerChargePerUnitRwf: value.containerChargePerUnitRwf,
          containerChargeFlatRwf: value.containerChargeFlatRwf,
          isAvailable: value.isAvailable,
          featured: optionalFields.includes("featured") ? value.featured : false,
        };
        const product = value.id
          ? await tx.marketplaceProduct.update({ where: { id: value.id }, data: productData })
          : await tx.marketplaceProduct.create({ data: productData });
        const unit = await tx.marketplaceProductUnit.findFirst({
          where: { productId: product.id, isDefault: true },
          select: { id: true },
        });
        if (unit) {
          await tx.marketplaceProductUnit.update({
            where: { id: unit.id },
            data: {
              unitType: capabilities?.productUnitsEnabled ? value.unitType : "EACH",
              label: capabilities?.productUnitsEnabled ? value.unitLabel : "Each",
              priceRwf: value.priceRwf,
              isAvailable: value.isAvailable,
            },
          });
        } else {
          await tx.marketplaceProductUnit.create({
            data: {
              productId: product.id,
              unitType: capabilities?.productUnitsEnabled ? value.unitType : "EACH",
              label: capabilities?.productUnitsEnabled ? value.unitLabel : "Each",
              priceRwf: value.priceRwf,
              isDefault: true,
              isAvailable: value.isAvailable,
            },
          });
        }
        await tx.marketplaceInventory.upsert({
          where: { productId: product.id },
          update: { stockQuantity: capabilities?.stockTrackingRequired ? value.stockQuantity : 1 },
          create: { productId: product.id, stockQuantity: capabilities?.stockTrackingRequired ? value.stockQuantity : 1 },
        });
      });
    }
  }

  revalidatePath("/admin/products");
  revalidatePath("/stores");
  return NextResponse.json({ ok: true });
}
