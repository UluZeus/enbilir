import { MarketAssistantDashboard } from "@/components/ai-market/MarketAssistantDashboard";
import { getSafeLocale } from "@/i18n/config";
import { AI_MARKET_SYMBOLS } from "@/lib/ai-market/symbols";

export default async function AiMarketAssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);

  return (
    <div className="mx-[calc(50%-50vw)] min-h-screen bg-[#030711] px-3 py-4 md:px-5">
      <MarketAssistantDashboard locale={locale} symbols={AI_MARKET_SYMBOLS} />
    </div>
  );
}
