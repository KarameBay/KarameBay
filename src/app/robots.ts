import type { MetadataRoute } from "next";

const siteUrl = "https://www.karamebay.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/admin",
          "/admin/",
          "/api/",
          "/checkout/",
          "/customer/",
          "/dashboard/",
          "/rider/",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
