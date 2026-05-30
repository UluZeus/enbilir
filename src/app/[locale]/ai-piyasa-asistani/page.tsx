import { MarketAssistantDashboard } from "@/components/ai-market/MarketAssistantDashboard";
import { getSafeLocale } from "@/i18n/config";
import { AI_MARKET_SYMBOLS } from "@/lib/ai-market/symbols";

export default async function AiMarketAssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);

  return (
    <div className="grid gap-6">
      <section className="hero-visual p-6 text-white sm:p-8">
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">AI Piyasa Asistani</p>
            <h1 className="mt-3 text-3xl font-black tracking-normal sm:text-5xl">Public verilerle teknik sinyal paneli</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              Kripto icin Binance/Gate.io public veri; altin, gumus ve USD/TRY icin Yahoo public veri uzerinden RSI, MACD,
              EMA, Bollinger Bands, ATR ve hacim anomalisi izlenir. Bu ekran borsa hesabina baglanmaz, API key kullanmaz ve emir gondermez.
            </p>
          </div>
        </div>
      </section>

      <MarketAssistantDashboard locale={locale} symbols={AI_MARKET_SYMBOLS} />
    </div>
  );
}
