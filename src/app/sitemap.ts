import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const siteUrl = "https://www.karamebay.com";
type SitemapEntry = MetadataRoute.Sitemap[number];

export const dynamic = "force-dynamic";

const staticPages = [
  "",
  "/explore",
  "/restaurants",
  "/markets",
  "/customer/parcels/new",
  "/about",
  "/contact",
  "/help",
  "/faq",
  "/delivery-policy",
  "/parcel-policy",
  "/privacy",
  "/terms",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const stores = await db.store
    .findMany({
      where: {
        status: "APPROVED",
        isOpen: true,
      },
      select: {
        slug: true,
        updatedAt: true,
      },
      orderBy: {
        updatedAt: "desc",
      },
      take: 500,
    })
    .catch(() => []);

  const pages: SitemapEntry[] = staticPages.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "daily" : "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  const storePages: SitemapEntry[] = stores.map((store) => ({
    url: `${siteUrl}/stores/${store.slug}`,
    lastModified: store.updatedAt,
    changeFrequency: "daily",
    priority: 0.8,
  }));

  return [
    ...pages,
    ...storePages,
  ];
}
