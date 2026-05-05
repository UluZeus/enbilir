import type { MetadataRoute } from "next";

const routes = [
  "",
  "/giris",
  "/kayit",
  "/ligler",
  "/liderlik-tablosu",
  "/blog",
  "/egitim",
  "/iletisim",
  "/kvkk",
  "/acik-riza",
  "/cerez-politikasi",
  "/kullanim-sartlari",
  "/yatirim-tavsiyesi-degildir",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://enbilir.com";
  const now = new Date();

  return ["tr", "en"].flatMap((locale) =>
    routes.map((route) => ({
      url: `${siteUrl}/${locale}${route}`,
      lastModified: now,
      changeFrequency: route === "" ? "daily" : "weekly",
      priority: route === "" ? 1 : 0.7,
    })),
  );
}
