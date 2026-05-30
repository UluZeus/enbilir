import { MarketAssistantDashboard } from "@/components/ai-market/MarketAssistantDashboard";
import { getSafeLocale } from "@/i18n/config";
import { AI_MARKET_SYMBOLS } from "@/lib/ai-market/symbols";

export default async function AiMarketAssistantPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  getSafeLocale(rawLocale);

  return (
    <div className="grid gap-6">
      <section className="hero-visual p-6 text-white sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">AI Piyasa Asistani</p>
        <h1 className="relative mt-3 text-3xl font-black tracking-normal sm:text-5xl">Public verilerle teknik sinyal paneli</h1>
        <p className="relative mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Binance ve Gate.io public market data uzerinden RSI, MACD, EMA, Bollinger Bands, ATR ve hacim anomalisi izlenir.
          Bu ekran borsa hesabina baglanmaz, API key kullanmaz ve emir gondermez.
        </p>
      </section>

      <MarketAssistantDashboard symbols={AI_MARKET_SYMBOLS} />
    </div>
  );
}
