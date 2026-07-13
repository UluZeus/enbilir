import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",
        "/tr/admin",
        "/en/admin",
        "/tr/panel",
        "/en/panel",
        "/tr/baslangic",
        "/en/baslangic",
        "/tr/islem-yap",
        "/en/islem-yap",
        "/tr/liderlik-tablosu",
        "/en/liderlik-tablosu",
        "/tr/haftalik-liderler",
        "/en/haftalik-liderler",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: siteUrl,
  };
}
