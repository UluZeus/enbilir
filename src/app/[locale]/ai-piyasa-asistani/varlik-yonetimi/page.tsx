import type { Metadata } from "next";
import { AssetManagementDashboard } from "@/components/ai-market/AssetManagementDashboard";
import { getSafeLocale } from "@/i18n/config";
import { getLocalizedAiMarketSymbols } from "@/lib/ai-market/symbols";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/ai-piyasa-asistani/varlik-yonetimi", page: "assetManagement" });
}

export default async function AiMarketAssetManagementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);

  return <AssetManagementDashboard locale={locale} symbols={getLocalizedAiMarketSymbols(locale)} />;
}
