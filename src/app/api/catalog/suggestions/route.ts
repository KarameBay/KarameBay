import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

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
            { name: { contains: term } },
            { type: { contains: term } },
            { description: { contains: term } },
          ],
        },
        orderBy: [{ featured: "desc" }, { name: "asc" }],
        take: 3,
        select: { id: true, name: true, slug: true, type: true },
      }),
      db.restaurantProduct.findMany({
        where: {
          isAvailable: true,
          seasonal: false,
          store: { status: "APPROVED" },
          OR: [
            { name: { contains: term } },
            { category: { name: { contains: term } } },
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
          store: { status: "APPROVED" },
          OR: [
            { name: { contains: term } },
            { brand: { contains: term } },
            { category: { name: { contains: term } } },
            { department: { name: { contains: term } } },
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
          name: { contains: term },
          store: { status: "APPROVED" },
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
          name: { contains: term },
          department: { store: { status: "APPROVED" } },
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
      subtitle: store.type === "RESTAURANT" ? "Restaurant" : "Market",
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
