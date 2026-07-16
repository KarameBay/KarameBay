import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";

const nullableText = z
  .string()
  .trim()
  .transform((value) => (value.length ? value : null))
  .optional()
  .nullable();

const booleanish = z.union([z.boolean(), z.literal("true"), z.literal("false")]).transform((value) =>
  value === true || value === "true",
);

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

async function uniqueStoreSlug(
  findExisting: (slug: string, excludeId?: string) => Promise<{ id: string } | null>,
  base: string,
  excludeId?: string,
) {
  let slug = base;
  let counter = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await findExisting(slug, excludeId);
    if (!existing) return slug;
    slug = `${base}-${counter++}`;
  }
}

async function nextSortOrder(
  findLatest: () => Promise<{ sortOrder: number } | null>,
) {
  const latest = await findLatest();
  return (latest?.sortOrder ?? -1) + 1;
}

function uniqueIds(values: Array<string | undefined> | undefined) {
  return Array.from(new Set((values ?? []).filter((value): value is string => Boolean(value))));
}

const categorySchema = z.object({
  entity: z.literal("category"),
  action: z.enum(["save", "delete"]),
  id: z.string().optional(),
  storeId: z.string().min(1).optional(),
  name: z.string().trim().min(2).optional(),
  slug: z.string().trim().optional(),
  description: nullableText,
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const productSchema = z.object({
  entity: z.literal("product"),
  action: z.enum(["save", "delete"]),
  id: z.string().optional(),
  storeId: z.string().min(1).optional(),
  categoryId: z.string().min(1).optional(),
  name: z.string().trim().min(2).optional(),
  slug: z.string().trim().optional(),
  description: nullableText,
  basePriceRwf: z.coerce.number().int().min(0).default(0),
  imageUrl: nullableText,
  isAvailable: booleanish.default(true),
});

const variantSchema = z.object({
  entity: z.literal("variant"),
  action: z.enum(["save", "delete"]),
  id: z.string().optional(),
  productId: z.string().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  priceRwf: z.coerce.number().int().min(0).default(0),
  isDefault: booleanish.default(false),
  isAvailable: booleanish.default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const groupSchema = z.object({
  entity: z.literal("choice-group"),
  action: z.enum(["save", "delete"]),
  id: z.string().optional(),
  productId: z.string().min(1).optional(),
  name: z.string().trim().min(2).optional(),
  required: booleanish.default(false),
  minChoices: z.coerce.number().int().min(0).default(0),
  maxChoices: z.coerce.number().int().min(1).default(1),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const optionSchema = z.object({
  entity: z.literal("choice-option"),
  action: z.enum(["save", "delete"]),
  id: z.string().optional(),
  groupId: z.string().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  priceAdjustmentRwf: z.coerce.number().int().default(0),
  isAvailable: booleanish.default(true),
  sortOrder: z.coerce.number().int().min(0).default(0),
});

const addOnSchema = z.object({
  entity: z.literal("addon"),
  action: z.enum(["save", "delete"]),
  id: z.string().optional(),
  storeId: z.string().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  category: nullableText,
  description: nullableText,
  priceRwf: z.coerce.number().int().min(0).default(0),
  selectionMode: z.enum(["SINGLE", "MULTIPLE"]).default("SINGLE"),
  required: booleanish.default(false),
  minSelections: z.coerce.number().int().min(0).default(0),
  maxSelections: z.coerce.number().int().min(1).default(1),
  sortOrder: z.coerce.number().int().min(0).default(0),
  isAvailable: booleanish.default(true),
});

const addOnOptionSchema = z.object({
  entity: z.literal("addon-option"),
  action: z.enum(["save", "delete"]),
  id: z.string().optional(),
  addOnId: z.string().min(1).optional(),
  name: z.string().trim().min(1).optional(),
  priceAdjustmentRwf: z.coerce.number().int().default(0),
  isAvailable: booleanish.default(true),
});

const linkSchema = z.object({
  entity: z.literal("addon-link"),
  action: z.enum(["save", "delete"]),
  productId: z.string().min(1).optional(),
  productIds: z.array(z.string().min(1)).optional(),
  addOnId: z.string().min(1).optional(),
  groupName: z.string().trim().min(1).optional(),
  selectionMode: z.enum(["SINGLE", "MULTIPLE"]).default("SINGLE"),
  required: booleanish.optional(),
  minSelections: z.coerce.number().int().min(0).optional(),
  maxSelections: z.coerce.number().int().min(1).optional(),
  hiddenOptionIds: z.array(z.string().min(1)).optional(),
  optionPriceOverrides: z.record(z.string(), z.coerce.number().int()).optional(),
});

const choiceGroupCopySchema = z.object({
  entity: z.literal("choice-group-copy"),
  sourceGroupId: z.string().min(1).optional(),
  targetProductId: z.string().min(1).optional(),
  targetProductIds: z.array(z.string().min(1)).optional(),
});

const payloadSchema = z.discriminatedUnion("entity", [
  categorySchema,
  productSchema,
  variantSchema,
  groupSchema,
  optionSchema,
  addOnSchema,
  addOnOptionSchema,
  linkSchema,
  choiceGroupCopySchema,
]);

export async function POST(request: Request) {
  const admin = await getCurrentUser("ADMIN");
  if (!admin)
    return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (admin.role !== "ADMIN")
    return NextResponse.json(
      { error: "Administrator access required" },
      { status: 403 },
    );

  const parsed = payloadSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid menu data" }, { status: 400 });
  }

  const input = parsed.data;

  if (input.entity === "category") {
    if (input.action === "delete") {
      if (!input.id) {
        return NextResponse.json({ error: "Category id is required" }, { status: 400 });
      }
      const existing = await db.restaurantCategory.findUnique({
        where: { id: input.id },
        select: { id: true, storeId: true, products: { select: { id: true } } },
      });
      if (!existing)
        return NextResponse.json({ error: "Category not found" }, { status: 404 });
      if (existing.products.length) {
        return NextResponse.json(
          { error: "Move or delete the products in this category first." },
          { status: 409 },
        );
      }
      await db.restaurantCategory.delete({ where: { id: input.id } });
      revalidatePath("/admin/menus");
      revalidatePath("/admin/products");
      return NextResponse.json({ ok: true });
    }
    if (!input.storeId || !input.name) {
      return NextResponse.json({ error: "Store and category name are required" }, { status: 400 });
    }
    const store = await db.store.findFirst({
      where: { id: input.storeId, catalogEngine: "RESTAURANT" },
      select: { id: true, slug: true },
    });
    if (!store)
      return NextResponse.json({ error: "Restaurant store not found" }, { status: 404 });
    const baseSlug = slugify(input.slug || input.name);
    const slug = await uniqueStoreSlug(
      async (candidate, excludeId) =>
        db.restaurantCategory.findFirst({
          where: {
            storeId: store.id,
            slug: candidate,
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
          },
          select: { id: true },
        }),
      baseSlug,
      input.id,
    );
    const data = {
      storeId: store.id,
      slug,
      name: input.name,
      description: input.description || null,
      sortOrder: input.id
        ? undefined
        : await nextSortOrder(() =>
            db.restaurantCategory.findFirst({
              where: { storeId: store.id },
              orderBy: [{ sortOrder: "desc" }, { createdAt: "desc" }],
              select: { sortOrder: true },
            }),
          ),
    };
    if (input.id) {
      await db.restaurantCategory.update({ where: { id: input.id }, data });
    } else {
      await db.restaurantCategory.create({ data });
    }
    revalidatePath("/admin/menus");
    revalidatePath("/admin/products");
    revalidatePath(`/stores/${store.slug}`);
    return NextResponse.json({ ok: true });
  }

  if (input.entity === "product") {
    if (input.action === "delete") {
      if (!input.id)
        return NextResponse.json({ error: "Product id is required" }, { status: 400 });
      const existing = await db.restaurantProduct.findUnique({
        where: { id: input.id },
        select: { id: true, store: { select: { slug: true } } },
      });
      if (!existing)
        return NextResponse.json({ error: "Product not found" }, { status: 404 });
      await db.restaurantProduct.delete({ where: { id: input.id } });
      revalidatePath("/admin/menus");
      revalidatePath("/admin/products");
      revalidatePath(`/stores/${existing.store.slug}`);
      return NextResponse.json({ ok: true });
    }
    if (!input.storeId || !input.categoryId || !input.name) {
      return NextResponse.json(
        { error: "Store, category, and product name are required" },
        { status: 400 },
      );
    }
    const store = await db.store.findFirst({
      where: { id: input.storeId, catalogEngine: "RESTAURANT" },
      select: { id: true, slug: true },
    });
    if (!store)
      return NextResponse.json({ error: "Restaurant store not found" }, { status: 404 });
    const category = await db.restaurantCategory.findFirst({
      where: { id: input.categoryId, storeId: store.id },
      select: { id: true },
    });
    if (!category)
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    const baseSlug = slugify(input.slug || input.name);
    const slug = await uniqueStoreSlug(
      async (candidate, excludeId) =>
        db.restaurantProduct.findFirst({
          where: {
            storeId: store.id,
            slug: candidate,
            ...(excludeId ? { NOT: { id: excludeId } } : {}),
          },
          select: { id: true },
        }),
      baseSlug,
      input.id,
    );
    const data = {
      storeId: store.id,
      categoryId: category.id,
      slug,
      name: input.name,
      description: input.description || null,
      basePriceRwf: input.basePriceRwf,
      imageUrl: input.imageUrl || null,
      isAvailable: input.isAvailable,
    };
    if (input.id) {
      await db.restaurantProduct.update({ where: { id: input.id }, data });
    } else {
      await db.restaurantProduct.create({ data });
    }
    revalidatePath("/admin/menus");
    revalidatePath("/admin/products");
    revalidatePath(`/stores/${store.slug}`);
    return NextResponse.json({ ok: true });
  }

  if (input.entity === "variant") {
    if (input.action === "delete") {
      if (!input.id)
        return NextResponse.json({ error: "Variant id is required" }, { status: 400 });
      await db.restaurantVariant.delete({ where: { id: input.id } });
      revalidatePath("/admin/menus");
      revalidatePath("/admin/products");
      return NextResponse.json({ ok: true });
    }
    if (!input.productId || !input.name) {
      return NextResponse.json({ error: "Product and variant name are required" }, { status: 400 });
    }
    const product = await db.restaurantProduct.findUnique({
      where: { id: input.productId },
      select: { id: true, store: { select: { slug: true } } },
    });
    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const data = {
      productId: product.id,
      name: input.name,
      priceRwf: input.priceRwf,
      isDefault: input.isDefault,
      isAvailable: input.isAvailable,
      sortOrder: input.id
        ? undefined
        : await nextSortOrder(() =>
            db.restaurantVariant.findFirst({
              where: { productId: product.id },
              orderBy: [{ sortOrder: "desc" }],
              select: { sortOrder: true },
            }),
          ),
    };
    if (input.id) {
      await db.restaurantVariant.update({ where: { id: input.id }, data });
    } else {
      await db.restaurantVariant.create({ data });
    }
    revalidatePath("/admin/menus");
    revalidatePath("/admin/products");
    revalidatePath(`/stores/${product.store.slug}`);
    return NextResponse.json({ ok: true });
  }

  if (input.entity === "choice-group") {
    if (input.action === "delete") {
      if (!input.id)
        return NextResponse.json({ error: "Choice group id is required" }, { status: 400 });
      await db.restaurantChoiceGroup.delete({ where: { id: input.id } });
      revalidatePath("/admin/menus");
      revalidatePath("/admin/products");
      return NextResponse.json({ ok: true });
    }
    if (!input.productId || !input.name) {
      return NextResponse.json({ error: "Product and group name are required" }, { status: 400 });
    }
    const product = await db.restaurantProduct.findUnique({
      where: { id: input.productId },
      select: { id: true, store: { select: { slug: true } } },
    });
    if (!product)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    const data = {
      productId: product.id,
      name: input.name,
      required: input.required,
      minChoices: input.minChoices,
      maxChoices: input.maxChoices,
      sortOrder: input.id
        ? undefined
        : await nextSortOrder(() =>
            db.restaurantChoiceGroup.findFirst({
              where: { productId: product.id },
              orderBy: [{ sortOrder: "desc" }],
              select: { sortOrder: true },
            }),
          ),
    };
    if (input.id) {
      await db.restaurantChoiceGroup.update({ where: { id: input.id }, data });
    } else {
      await db.restaurantChoiceGroup.create({ data });
    }
    revalidatePath("/admin/menus");
    revalidatePath("/admin/products");
    revalidatePath(`/stores/${product.store.slug}`);
    return NextResponse.json({ ok: true });
  }

  if (input.entity === "choice-group-copy") {
    const targetProductIds = uniqueIds(
      input.targetProductIds?.length
        ? input.targetProductIds
        : input.targetProductId
          ? [input.targetProductId]
          : [],
    );
    if (!input.sourceGroupId || !targetProductIds.length) {
      return NextResponse.json(
        { error: "Source group and at least one target product are required" },
        { status: 400 },
      );
    }
    const sourceGroup = await db.restaurantChoiceGroup.findUnique({
      where: { id: input.sourceGroupId },
      select: {
        id: true,
        name: true,
        required: true,
        minChoices: true,
        maxChoices: true,
        product: { select: { storeId: true } },
        choices: {
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: {
            name: true,
            priceAdjustmentRwf: true,
            isAvailable: true,
            sortOrder: true,
          },
        },
      },
    });
    if (!sourceGroup) {
      return NextResponse.json({ error: "Choice group not found" }, { status: 404 });
    }
    const targetProducts = await db.restaurantProduct.findMany({
      where: { id: { in: targetProductIds } },
      select: {
        id: true,
        storeId: true,
        store: { select: { slug: true } },
      },
    });
    if (targetProducts.length !== targetProductIds.length) {
      return NextResponse.json({ error: "One or more target products were not found" }, { status: 404 });
    }
    if (targetProducts.some((product) => product.storeId !== sourceGroup.product.storeId)) {
      return NextResponse.json(
        { error: "Choice groups can only be copied within the same store." },
        { status: 409 },
      );
    }

    for (const targetProductId of targetProductIds) {
      const targetProduct = targetProducts.find((product) => product.id === targetProductId);
      if (!targetProduct) continue;
      const latestTargetGroup = await db.restaurantChoiceGroup.findFirst({
        where: { productId: targetProduct.id },
        orderBy: [{ sortOrder: "desc" }, { name: "desc" }],
        select: { sortOrder: true },
      });
      const sortOrder = (latestTargetGroup?.sortOrder ?? -1) + 1;
      const createdGroup = await db.restaurantChoiceGroup.create({
        data: {
          productId: targetProduct.id,
          name: sourceGroup.name,
          required: sourceGroup.required,
          minChoices: sourceGroup.minChoices,
          maxChoices: sourceGroup.maxChoices,
          sortOrder,
        },
        select: { id: true },
      });

      if (sourceGroup.choices.length) {
        await db.restaurantChoiceOption.createMany({
          data: sourceGroup.choices.map((choice) => ({
            groupId: createdGroup.id,
            name: choice.name,
            priceAdjustmentRwf: choice.priceAdjustmentRwf,
            isAvailable: choice.isAvailable,
            sortOrder: choice.sortOrder,
          })),
        });
      }
    }

    revalidatePath("/admin/menus");
    revalidatePath("/admin/products");
    revalidatePath(`/stores/${targetProducts[0]?.store.slug}`);
    return NextResponse.json({ ok: true });
  }

  if (input.entity === "choice-option") {
    if (input.action === "delete") {
      if (!input.id)
        return NextResponse.json({ error: "Choice option id is required" }, { status: 400 });
      await db.restaurantChoiceOption.delete({ where: { id: input.id } });
      revalidatePath("/admin/menus");
      revalidatePath("/admin/products");
      return NextResponse.json({ ok: true });
    }
    if (!input.groupId || !input.name) {
      return NextResponse.json({ error: "Group and option name are required" }, { status: 400 });
    }
    const group = await db.restaurantChoiceGroup.findUnique({
      where: { id: input.groupId },
      select: { id: true, product: { select: { store: { select: { slug: true } } } } },
    });
    if (!group)
      return NextResponse.json({ error: "Choice group not found" }, { status: 404 });
    const data = {
      groupId: group.id,
      name: input.name,
      priceAdjustmentRwf: input.priceAdjustmentRwf,
      isAvailable: input.isAvailable,
      sortOrder: input.id
        ? undefined
        : await nextSortOrder(() =>
            db.restaurantChoiceOption.findFirst({
              where: { groupId: group.id },
              orderBy: [{ sortOrder: "desc" }],
              select: { sortOrder: true },
            }),
          ),
    };
    if (input.id) {
      await db.restaurantChoiceOption.update({ where: { id: input.id }, data });
    } else {
      await db.restaurantChoiceOption.create({ data });
    }
    revalidatePath("/admin/menus");
    revalidatePath("/admin/products");
    revalidatePath(`/stores/${group.product.store.slug}`);
    return NextResponse.json({ ok: true });
  }

  if (input.entity === "addon") {
    if (input.action === "delete") {
      if (!input.id)
        return NextResponse.json({ error: "Add-on id is required" }, { status: 400 });
      const existing = await db.restaurantAddOn.findUnique({
        where: { id: input.id },
        select: { id: true, store: { select: { slug: true } } },
      });
      if (!existing)
        return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
      await db.restaurantAddOn.delete({ where: { id: input.id } });
      revalidatePath("/admin/menus");
      revalidatePath("/admin/products");
      revalidatePath(`/stores/${existing.store.slug}`);
      return NextResponse.json({ ok: true });
    }
    if (!input.storeId || !input.name) {
      return NextResponse.json({ error: "Store and add-on name are required" }, { status: 400 });
    }
    const store = await db.store.findFirst({
      where: { id: input.storeId, catalogEngine: "RESTAURANT" },
      select: { id: true, slug: true },
    });
    if (!store)
      return NextResponse.json({ error: "Restaurant store not found" }, { status: 404 });
    const data = {
      storeId: store.id,
      name: input.name,
      category: input.category || null,
      description: input.description ?? null,
      priceRwf: input.priceRwf,
      selectionMode: input.selectionMode,
      required: input.required,
      minSelections: input.minSelections,
      maxSelections: input.maxSelections,
      sortOrder: input.sortOrder,
      isAvailable: input.isAvailable,
    };
    if (input.id) {
      await db.restaurantAddOn.update({ where: { id: input.id }, data });
    } else {
      await db.restaurantAddOn.create({ data });
    }
    revalidatePath("/admin/menus");
    revalidatePath("/admin/products");
    revalidatePath(`/stores/${store.slug}`);
    return NextResponse.json({ ok: true });
  }

  if (input.entity === "addon-option") {
    if (input.action === "delete") {
      if (!input.id)
        return NextResponse.json({ error: "Add-on option id is required" }, { status: 400 });
      const existing = await db.restaurantAddOnOption.findUnique({
        where: { id: input.id },
        select: { id: true, addOn: { select: { storeId: true, store: { select: { slug: true } } } } },
      });
      if (!existing)
        return NextResponse.json({ error: "Add-on option not found" }, { status: 404 });
      await db.restaurantAddOnOption.delete({ where: { id: input.id } });
      revalidatePath("/admin/menus");
      revalidatePath("/admin/products");
      revalidatePath(`/stores/${existing.addOn.store.slug}`);
      return NextResponse.json({ ok: true });
    }
    if (!input.addOnId || !input.name) {
      return NextResponse.json(
        { error: "Add-on and option name are required" },
        { status: 400 },
      );
    }
    const addOn = await db.restaurantAddOn.findUnique({
      where: { id: input.addOnId },
      select: { id: true, storeId: true, store: { select: { slug: true } } },
    });
    if (!addOn)
      return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
    const data = {
      addOnId: addOn.id,
      name: input.name,
      priceAdjustmentRwf: input.priceAdjustmentRwf,
      isAvailable: input.isAvailable,
      sortOrder: input.id
        ? undefined
        : await nextSortOrder(() =>
            db.restaurantAddOnOption.findFirst({
              where: { addOnId: addOn.id },
              orderBy: [{ sortOrder: "desc" }],
              select: { sortOrder: true },
            }),
          ),
    };
    if (input.id) {
      await db.restaurantAddOnOption.update({ where: { id: input.id }, data });
    } else {
      await db.restaurantAddOnOption.create({ data });
    }
    revalidatePath("/admin/menus");
    revalidatePath("/admin/products");
    revalidatePath(`/stores/${addOn.store.slug}`);
    return NextResponse.json({ ok: true });
  }

  if (input.entity === "addon-link") {
    const productIds = uniqueIds(
      input.productIds?.length ? input.productIds : input.productId ? [input.productId] : [],
    );
    if (!productIds.length || !input.addOnId) {
      return NextResponse.json({ error: "Product and add-on are required" }, { status: 400 });
    }
    const products = await db.restaurantProduct.findMany({
      where: { id: { in: productIds } },
      select: { id: true, storeId: true, store: { select: { slug: true } } },
    });
    if (products.length !== productIds.length)
      return NextResponse.json({ error: "One or more products were not found" }, { status: 404 });
    const addOn = await db.restaurantAddOn.findUnique({
      where: { id: input.addOnId },
      select: { id: true, storeId: true, store: { select: { slug: true } } },
    });
    if (!addOn)
      return NextResponse.json({ error: "Add-on not found" }, { status: 404 });
    if (products.some((product) => product.storeId !== addOn.storeId)) {
      return NextResponse.json(
        { error: "Add-ons can only be linked to products in the same store." },
        { status: 409 },
      );
    }
    if (input.action === "delete") {
      if (productIds.length === 1) {
        await db.restaurantProductAddOn.delete({
          where: {
            productId_addOnId: { productId: productIds[0], addOnId: addOn.id },
          },
        }).catch(() => null);
      } else {
        await db.restaurantProductAddOn.deleteMany({
          where: {
            addOnId: addOn.id,
            productId: { in: productIds },
          },
        });
      }
    } else {
      const optionPriceOverrides = input.optionPriceOverrides
        ? (Object.fromEntries(
            Object.entries(input.optionPriceOverrides).map(([key, value]) => [key, value]),
          ) as Prisma.InputJsonValue)
        : undefined;
      const data = {
        groupName: input.groupName ?? null,
        required: typeof input.required === "boolean" ? input.required : undefined,
        selectionMode: input.selectionMode,
        minSelections: typeof input.minSelections === "number" ? input.minSelections : undefined,
        maxSelections: typeof input.maxSelections === "number" ? input.maxSelections : undefined,
        hiddenOptionIds: input.hiddenOptionIds ?? undefined,
        optionPriceOverrides,
      };
      if (productIds.length === 1) {
        await db.restaurantProductAddOn.upsert({
          where: {
            productId_addOnId: { productId: productIds[0], addOnId: addOn.id },
          },
          update: data,
          create: {
            productId: productIds[0],
            addOnId: addOn.id,
            ...data,
          },
        });
      } else {
        await Promise.all(
          productIds.map((productId) =>
            db.restaurantProductAddOn.upsert({
              where: {
                productId_addOnId: { productId, addOnId: addOn.id },
              },
              update: data,
              create: {
                productId,
                addOnId: addOn.id,
                ...data,
              },
            }),
          ),
        );
      }
    }
    revalidatePath("/admin/menus");
    revalidatePath("/admin/products");
    revalidatePath(`/stores/${addOn.store.slug}`);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unsupported operation" }, { status: 400 });
}
