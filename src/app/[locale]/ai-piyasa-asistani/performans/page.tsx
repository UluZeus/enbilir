import type { Metadata } from "next";
import { AiSignalPerformanceDashboard } from "@/components/ai-market/AiSignalPerformanceDashboard";
import { getSafeLocale } from "@/i18n/config";
import { AI_MARKET_SYMBOLS } from "@/lib/ai-market/symbols";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/ai-piyasa-asistani/performans", page: "aiPerformance" });
}

export default async function AiSignalPerformancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);

  return <AiSignalPerformanceDashboard locale={locale} symbols={AI_MARKET_SYMBOLS} />;
}
