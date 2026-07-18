import type { MetadataRoute } from "next";
import { getManagedContentLocalizedIds } from "@/i18n/localized-path";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const staticRoutes = [
  { path: "", frequency: "daily", priority: 1 },
  { path: "/ogren", frequency: "weekly", priority: 0.92 },
  { path: "/kullanim-kilavuzu", frequency: "weekly", priority: 0.9 },
  { path: "/risk-istahi-testi", frequency: "weekly", priority: 0.86 },
  { path: "/ai-piyasa-asistani", frequency: "daily", priority: 0.95 },
  { path: "/ai-piyasa-asistani/raporlar", frequency: "daily", priority: 0.93 },
  { path: "/ai-piyasa-asistani/performans", frequency: "daily", priority: 0.78 },
  { path: "/ai-piyasa-asistani/varlik-yonetimi", frequency: "daily", priority: 0.78 },
  { path: "/kayit", frequency: "weekly", priority: 0.82 },
  { path: "/giris", frequency: "weekly", priority: 0.58 },
  { path: "/ligler", frequency: "daily", priority: 0.86 },
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
  { path: "/vip", frequency: "daily", priority: 0.84 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
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
    where: { isActive: true, type: { not: "PRIVATE" } },
    orderBy: { updatedAt: "desc" },
    select: { slug: true, updatedAt: true, createdAt: true },
  });
  const managedContentKeys = new Set(
    managedContentItems.map((item) => `${item.type}:${item.locale}:${item.id}`),
  );

  const staticItems = ["tr", "en"].flatMap((locale) =>
    staticRoutes.map((route) => {
      const path = route.path;

      return {
        url: `${siteUrl}/${locale}${path}`,
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
    const localizedIds = getManagedContentLocalizedIds(item.id);
    const path = item.type === "EDUCATION" ? "egitim" : "blog";
    const hasCompleteTranslationPair =
      managedContentKeys.has(`${item.type}:tr:${localizedIds.tr}`)
      && managedContentKeys.has(`${item.type}:en:${localizedIds.en}`);

    return {
      url: `${siteUrl}/${item.locale}/${path}/${item.id}`,
      lastModified: item.updatedAt ?? item.publishedAt,
      changeFrequency: "monthly" as const,
      priority: item.type === "EDUCATION" ? 0.72 : 0.68,
      ...(hasCompleteTranslationPair ? { alternates: {
        languages: {
          tr: `${siteUrl}/tr/${path}/${localizedIds.tr}`,
          en: `${siteUrl}/en/${path}/${localizedIds.en}`,
        },
      } } : {}),
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
