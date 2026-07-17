import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const containsInsensitive = (term: string) => ({
  contains: term,
  mode: Prisma.QueryMode.insensitive,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = (searchParams.get("q") ?? "").trim().slice(0, 100);

  if (term.length < 2) {
    return NextResponse.json({ suggestions: [] });
  }

  const [stores, restaurantProducts, marketplaceProducts, restaurantCategories, marketplaceCategories] =
    await Promise.all([
      db.store.findMany({
        where: {
          status: "APPROVED",
          OR: [
            { name: containsInsensitive(term) },
            { type: containsInsensitive(term) },
            { description: containsInsensitive(term) },
            { storeType: { is: { name: containsInsensitive(term) } } },
            { storeType: { is: { customerSectionName: containsInsensitive(term) } } },
          ],
          storeType: { is: { isActive: true } },
        },
        orderBy: [{ featured: "desc" }, { name: "asc" }],
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          type: true,
          storeType: { select: { name: true } },
        },
      }),
      db.restaurantProduct.findMany({
        where: {
          isAvailable: true,
          seasonal: false,
          store: { status: "APPROVED", storeType: { is: { isActive: true } } },
          OR: [
            { name: containsInsensitive(term) },
            { category: { name: containsInsensitive(term) } },
          ],
        },
        orderBy: [{ featured: "desc" }, { name: "asc" }],
        take: 5,
        select: {
          id: true,
          name: true,
          store: { select: { name: true, slug: true } },
          category: { select: { name: true } },
        },
      }),
      db.marketplaceProduct.findMany({
        where: {
          isAvailable: true,
          store: { status: "APPROVED", storeType: { is: { isActive: true } } },
          OR: [
            { name: containsInsensitive(term) },
            { brand: containsInsensitive(term) },
            { category: { name: containsInsensitive(term) } },
            { department: { name: containsInsensitive(term) } },
          ],
        },
        orderBy: [{ featured: "desc" }, { name: "asc" }],
        take: 5,
        select: {
          id: true,
          name: true,
          store: { select: { name: true, slug: true } },
          category: { select: { name: true } },
        },
      }),
      db.restaurantCategory.findMany({
        where: {
          isActive: true,
          name: containsInsensitive(term),
          store: { status: "APPROVED", storeType: { is: { isActive: true } } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          store: { select: { name: true, slug: true } },
        },
      }),
      db.marketplaceCategory.findMany({
        where: {
          name: containsInsensitive(term),
          department: { store: { status: "APPROVED", storeType: { is: { isActive: true } } } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: 3,
        select: {
          id: true,
          name: true,
          slug: true,
          department: { select: { store: { select: { name: true, slug: true } } } },
        },
      }),
    ]);

  const suggestions = [
    ...stores.map((store) => ({
      id: store.id,
      kind: "store" as const,
      label: store.name,
      subtitle: store.storeType?.name ?? "Store",
      href: `/stores/${store.slug}`,
    })),
    ...restaurantProducts.map((product) => ({
      id: product.id,
      kind: "product" as const,
      label: product.name,
      subtitle: `${product.category.name} · ${product.store.name}`,
      href: `/stores/${product.store.slug}/products/${product.id}`,
    })),
    ...marketplaceProducts.map((product) => ({
      id: product.id,
      kind: "product" as const,
      label: product.name,
      subtitle: `${product.category.name} · ${product.store.name}`,
      href: `/stores/${product.store.slug}?q=${encodeURIComponent(product.name)}`,
    })),
    ...restaurantCategories.map((category) => ({
      id: category.id,
      kind: "category" as const,
      label: category.name,
      subtitle: category.store.name,
      href: `/stores/${category.store.slug}?category=${category.slug}`,
    })),
    ...marketplaceCategories.map((category) => ({
      id: category.id,
      kind: "category" as const,
      label: category.name,
      subtitle: category.department.store.name,
      href: `/stores/${category.department.store.slug}?category=${category.slug}`,
    })),
  ].slice(0, 10);

  return NextResponse.json(
    { suggestions },
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
