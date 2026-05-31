import { AiSignalPerformanceDashboard } from "@/components/ai-market/AiSignalPerformanceDashboard";
import { getSafeLocale } from "@/i18n/config";
import { AI_MARKET_SYMBOLS } from "@/lib/ai-market/symbols";

export default async function AiSignalPerformancePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);

  return <AiSignalPerformanceDashboard locale={locale} symbols={AI_MARKET_SYMBOLS} />;
}
