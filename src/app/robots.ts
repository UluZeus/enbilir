import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://enbilir.com";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/tr/admin", "/en/admin", "/tr/panel", "/en/panel"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
