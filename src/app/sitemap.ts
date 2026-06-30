import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

const staticRoutes = [
  { path: "", frequency: "daily", priority: 1 },
  { path: "/islem-yap", frequency: "daily", priority: 0.92 },
  { path: "/kullanim-kilavuzu", frequency: "weekly", priority: 0.9 },
  { path: "/risk-istahi-testi", frequency: "weekly", priority: 0.86 },
  { path: "/ai-piyasa-asistani", frequency: "daily", priority: 0.95 },
  { path: "/ai-piyasa-asistani/raporlar", frequency: "daily", priority: 0.93 },
  { path: "/ai-piyasa-asistani/performans", frequency: "daily", priority: 0.78 },
  { path: "/ai-piyasa-asistani/varlik-yonetimi", frequency: "daily", priority: 0.78 },
  { path: "/kayit", frequency: "weekly", priority: 0.82 },
  { path: "/giris", frequency: "weekly", priority: 0.58 },
  { path: "/ligler", frequency: "daily", priority: 0.86 },
  { path: "/liderlik-tablosu", frequency: "daily", priority: 0.8 },
  { path: "/haftalik-liderler", frequency: "weekly", priority: 0.76 },
  { path: "/topluluk", frequency: "weekly", priority: 0.76 },
  { path: "/sohbet", frequency: "daily", priority: 0.74 },
  { path: "/icerik-merkezi", frequency: "weekly", priority: 0.9 },
  { path: "/blog", frequency: "weekly", priority: 0.82 },
  { path: "/siteyi-anlamak", frequency: "weekly", priority: 0.86 },
  { path: "/egitim", frequency: "weekly", priority: 0.88 },
  { path: "/iletisim", frequency: "monthly", priority: 0.62 },
  { path: "/kvkk", frequency: "yearly", priority: 0.35 },
  { path: "/acik-riza", frequency: "yearly", priority: 0.35 },
  { path: "/cerez-politikasi", frequency: "yearly", priority: 0.35 },
  { path: "/kullanim-sartlari", frequency: "yearly", priority: 0.35 },
  { path: "/yatirim-tavsiyesi-degildir", frequency: "yearly", priority: 0.45 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const managedContentItems = await prisma.managedContentItem.findMany({
    where: { type: { in: ["BLOG", "EDUCATION"] }, isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { id: true, type: true, locale: true, updatedAt: true, publishedAt: true },
  });
  const latestReports = await prisma.aiMarketReport.findMany({
    where: { scope: { in: ["GLOBAL", "WEEKLY"] }, status: "COMPLETED" },
    orderBy: { generatedAt: "desc" },
    take: 50,
    select: { id: true, updatedAt: true, generatedAt: true },
  });
  const activeLeagues = await prisma.league.findMany({
    where: { isActive: true },
    orderBy: { updatedAt: "desc" },
    select: { slug: true, updatedAt: true, createdAt: true },
  });

  const staticItems = ["tr", "en"].flatMap((locale) =>
    staticRoutes.map((route) => {
      const path = route.path;

      return {
        url: `${siteUrl}/${locale}${path}`,
        lastModified: now,
        changeFrequency: route.frequency as MetadataRoute.Sitemap[number]["changeFrequency"],
        priority: route.priority,
        alternates: {
          languages: {
            tr: `${siteUrl}/tr${path}`,
            en: `${siteUrl}/en${path}`,
          },
        },
      };
    }),
  );

  const contentItems = managedContentItems.map((item) => {
    const baseId = item.locale === "en" && item.id.endsWith("-en") ? item.id.slice(0, -3) : item.id;
    const trId = baseId;
    const enId = `${baseId}-en`;
    const path = item.type === "EDUCATION" ? "egitim" : "blog";

    return {
      url: `${siteUrl}/${item.locale}/${path}/${item.id}`,
      lastModified: item.updatedAt ?? item.publishedAt ?? now,
      changeFrequency: "monthly" as const,
      priority: item.type === "EDUCATION" ? 0.72 : 0.68,
      alternates: {
        languages: {
          tr: `${siteUrl}/tr/${path}/${trId}`,
          en: `${siteUrl}/en/${path}/${enId}`,
        },
      },
    };
  });

  const reportItems = ["tr", "en"].flatMap((locale) =>
    latestReports.map((report) => ({
      url: `${siteUrl}/${locale}/ai-piyasa-asistani/raporlar/${report.id}`,
      lastModified: report.updatedAt ?? report.generatedAt,
      changeFrequency: "daily" as const,
      priority: 0.72,
      alternates: {
        languages: {
          tr: `${siteUrl}/tr/ai-piyasa-asistani/raporlar/${report.id}`,
          en: `${siteUrl}/en/ai-piyasa-asistani/raporlar/${report.id}`,
        },
      },
    })),
  );

  const leagueItems = ["tr", "en"].flatMap((locale) =>
    activeLeagues.map((league) => ({
      url: `${siteUrl}/${locale}/ligler/${league.slug}`,
      lastModified: league.updatedAt ?? league.createdAt,
      changeFrequency: "daily" as const,
      priority: 0.7,
      alternates: {
        languages: {
          tr: `${siteUrl}/tr/ligler/${league.slug}`,
          en: `${siteUrl}/en/ligler/${league.slug}`,
        },
      },
    })),
  );

  return [...staticItems, ...contentItems, ...reportItems, ...leagueItems];
}
