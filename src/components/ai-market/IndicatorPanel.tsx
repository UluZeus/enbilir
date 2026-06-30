import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { getRiskLabel, localizeAiMarketText } from "@/lib/ai-market/localization";
import type { IndicatorSnapshot, RiskAssessment } from "@/lib/ai-market/types";

function formatNumber(value: number | null, digits = 2) {
  if (value === null) {
    return "-";
  }

  return value.toLocaleString("tr-TR", { maximumFractionDigits: digits });
}

export function IndicatorPanel({ locale, indicators, risk }: { locale: Locale | string; indicators: IndicatorSnapshot; risk: RiskAssessment }) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale).ai;
  const isEnglish = safeLocale === "en";
  const rows = [
    { label: "RSI", value: formatNumber(indicators.rsi) },
    { label: "MACD", value: formatNumber(indicators.macd.macd, 4) },
    { label: isEnglish ? "MACD signal" : "MACD sinyal", value: formatNumber(indicators.macd.signal, 4) },
    { label: "EMA 20", value: formatNumber(indicators.ema20) },
    { label: "EMA 50", value: formatNumber(indicators.ema50) },
    { label: "EMA 200", value: formatNumber(indicators.ema200) },
    { label: isEnglish ? "Bollinger upper" : "Bollinger üst", value: formatNumber(indicators.bollinger.upper) },
    { label: isEnglish ? "Bollinger middle" : "Bollinger orta", value: formatNumber(indicators.bollinger.middle) },
    { label: isEnglish ? "Bollinger lower" : "Bollinger alt", value: formatNumber(indicators.bollinger.lower) },
    { label: "ATR", value: formatNumber(indicators.atr, 4) },
    { label: isEnglish ? "Volume ratio" : "Hacim oranı", value: indicators.volumeAnomaly.ratio === null ? "-" : `${formatNumber(indicators.volumeAnomaly.ratio)}x` },
  ];

  return (
    <section className="rounded-md border border-slate-800 bg-[#0b111d] p-5 shadow-xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-black text-white">{isEnglish ? "Technical indicators" : "Teknik göstergeler"}</h2>
          <p className="mt-1 text-sm text-stone-300">{isEnglish ? "RSI, MACD, EMA, Bollinger, ATR, and volume checks" : "RSI, MACD, EMA, Bollinger, ATR ve hacim kontrolü"}</p>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm">
          <span className="font-bold text-stone-300">{copy.risk}</span>{" "}
          <span className={risk.level === "YUKSEK" ? "font-black text-red-600" : risk.level === "ORTA" ? "font-black text-amber-700" : "font-black text-[#0f766e]"}>
            {getRiskLabel(risk.level, safeLocale)} {risk.score}/100
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((row) => (
          <div key={row.label} className="rounded-md border border-slate-800 bg-slate-950/70 p-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-stone-300">{row.label}</p>
            <p className="mt-1 text-base font-black text-slate-100">{row.value}</p>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2">
        {risk.reasons.map((reason) => (
          <p key={reason} className="rounded-md border border-slate-800 bg-slate-950/70 px-3 py-2 text-sm text-stone-200">
            {localizeAiMarketText(reason, safeLocale)}
          </p>
        ))}
      </div>
    </section>
  );
}
