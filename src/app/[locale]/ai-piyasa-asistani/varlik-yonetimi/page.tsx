import { AssetManagementDashboard } from "@/components/ai-market/AssetManagementDashboard";
import { getSafeLocale } from "@/i18n/config";
import { AI_MARKET_SYMBOLS } from "@/lib/ai-market/symbols";

export default async function AiMarketAssetManagementPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);

  return <AssetManagementDashboard locale={locale} symbols={AI_MARKET_SYMBOLS} />;
}
