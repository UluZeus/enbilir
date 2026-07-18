import Link from "next/link";
import type { Locale } from "@/i18n/config";
import type {
  VipAssetClass,
  VipFundamentalSnapshot,
  VipInstitutionalSnapshot,
  VipShortInterestSnapshot,
  VipSource,
  VipTechnicalSnapshot,
} from "@/lib/vip-research/types";

type Evaluation = {
  horizon: string;
  status: string;
  dueAt: Date;
  evaluatedAt: Date | null;
  priceAtEvaluation: number | null;
  returnPercent: number | null;
};

type Idea = {
  id: string;
  rank: number;
  symbol: string;
  displayName: string;
  assetClass: string;
  currency: string;
  stance: string;
  thesisSummary: string;
  negativeCase: string;
  macroThesis: string;
  fundamentalThesis: string;
  technicalThesis: string;
  catalysts: unknown;
  exitPlan: string;
  institutionalPerception: string;
  shortInterestCommentary: string;
  confidenceScore: number;
  riskScore: number;
  priceAtRecommendation: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targetPrice: number;
  secondaryTargetPrice: number | null;
  fundamentalSnapshot: unknown;
  technicalSnapshot: unknown;
  institutionalSnapshot: unknown;
  shortInterestSnapshot: unknown;
  sources: unknown;
  evaluations: Evaluation[];
};

type Report = {
  id: string;
  generatedAt: Date;
  marketContext: string;
  executiveSummary: string;
  fallbackUsed: boolean;
  disclaimer: string;
  ideas: Idea[];
};

const horizons = ["1M", "3M", "6M", "1Y"];

function asStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asSources(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is VipSource => Boolean(item && typeof item === "object" && typeof (item as VipSource).url === "string" && typeof (item as VipSource).title === "string"))
    : [];
}

function asSnapshot<T>(value: unknown) {
  return value && typeof value === "object" ? value as T : null;
}

function number(value: number | null | undefined, digits = 2) {
  return typeof value === "number" && Number.isFinite(value) ? value.toLocaleString("tr-TR", { maximumFractionDigits: digits }) : "-";
}

function percent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value >= 0 ? "+" : ""}${value.toFixed(2)}%` : "-";
}

function plainPercent(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(2)}%` : "-";
}

function stanceTone(stance: string) {
  if (stance === "AL") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (stance === "UZAK_DUR") return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-amber-300 bg-amber-50 text-amber-900";
}

function assetClassLabel(assetClass: string, isEnglish: boolean) {
  const labels: Record<VipAssetClass, [string, string]> = {
    EQUITY: ["Hisse", "Equity"],
    BROAD_MARKET: ["Geniş piyasa", "Broad market"],
    COMMODITY: ["Emtia", "Commodity"],
    BOND: ["Tahvil", "Bond"],
    FX: ["Döviz", "FX"],
    CRYPTO: ["Kripto", "Crypto"],
  };

  return labels[assetClass as VipAssetClass]?.[isEnglish ? 1 : 0] ?? assetClass;
}

function crowdingLabel(level: string | undefined, isEnglish: boolean) {
  const labels: Record<string, [string, string]> = {
    LOW: ["Düşük", "Low"],
    MODERATE: ["Orta", "Moderate"],
    HIGH: ["Yüksek", "High"],
    EXTREME: ["Aşırı", "Extreme"],
  };

  return level ? labels[level]?.[isEnglish ? 1 : 0] ?? level : "-";
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white px-3 py-3"><dt className="text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 text-sm font-black text-slate-900">{value}</dd></div>;
}

export function VipResearchReportView({ report, locale, showArchiveLink = false }: { report: Report; locale: Locale; showArchiveLink?: boolean }) {
  const isEnglish = locale === "en";
  const date = new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(report.generatedAt);

  return (
    <div className="space-y-8">
      <header className="rounded-3xl border border-amber-300/35 bg-[#111827] p-7 text-white shadow-xl md:p-10">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Enbilir VIP · {isEnglish ? "Asymmetric Research" : "Asimetrik Araştırma"}</p>
            <h1 className="mt-3 text-3xl font-black md:text-5xl">{isEnglish ? "Institutional morning scorecard" : "Kurumsal sabah karnesi"}</h1>
            <p className="mt-3 text-sm font-bold text-slate-300">{date} · 07:00 Europe/Istanbul</p>
          </div>
          {showArchiveLink ? <Link href={`/${locale}/vip`} className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black hover:bg-white/20">{isEnglish ? "VIP archive" : "VIP arşivi"}</Link> : null}
        </div>
        <p className="mt-7 max-w-5xl text-base leading-8 text-slate-200">{report.executiveSummary}</p>
        {report.fallbackUsed ? <p className="mt-5 rounded-xl border border-amber-300/40 bg-amber-300/10 px-4 py-3 text-sm font-bold text-amber-100">{isEnglish ? "Catalyst research was incomplete; this edition is in quantitative watch-only mode." : "Katalizör araştırması tamamlanamadı; bu baskı nicel izleme modundadır ve AL notu üretmez."}</p> : null}
      </header>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-500">{isEnglish ? "Macro frame" : "Makro çerçeve"}</p>
        <p className="mt-3 whitespace-pre-line text-sm leading-7 text-slate-700">{report.marketContext}</p>
      </section>

      <div className="space-y-7">
        {report.ideas.map((idea) => {
          const fundamental = asSnapshot<VipFundamentalSnapshot>(idea.fundamentalSnapshot);
          const technical = asSnapshot<VipTechnicalSnapshot>(idea.technicalSnapshot);
          const institutional = asSnapshot<VipInstitutionalSnapshot>(idea.institutionalSnapshot);
          const shortInterest = asSnapshot<VipShortInterestSnapshot>(idea.shortInterestSnapshot);
          const sources = asSources(idea.sources);
          const isEquity = idea.assetClass === "EQUITY";

          return (
            <article key={idea.id} className="overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-sm">
              <div className="border-b border-slate-200 bg-white p-6 md:p-8">
                <div className="flex flex-wrap items-start justify-between gap-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-700">#{idea.rank} · {isEnglish ? "Asymmetric rank" : "Asimetrik sıralama"}</p>
                    <h2 className="mt-2 text-3xl font-black text-slate-950">{idea.symbol} <span className="text-base font-bold text-slate-500">{idea.displayName}</span></h2>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-black ${stanceTone(idea.stance)}`}>{idea.stance}</span>
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1 text-xs font-black text-slate-700">{assetClassLabel(idea.assetClass, isEnglish)} · {idea.currency}</span>
                      <span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-black text-violet-800">Crowding {number(technical?.crowdingScore, 0)}/100 · {crowdingLabel(technical?.crowdingLevel, isEnglish)}</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-emerald-950 px-5 py-3 text-center text-white"><p className="text-[10px] font-black uppercase text-emerald-200">{isEnglish ? "Confidence" : "Güven"}</p><p className="text-2xl font-black">{idea.confidenceScore}<span className="text-xs">/100</span></p></div>
                    <div className="rounded-2xl bg-rose-950 px-5 py-3 text-center text-white"><p className="text-[10px] font-black uppercase text-rose-200">{isEnglish ? "Risk" : "Risk"}</p><p className="text-2xl font-black">{idea.riskScore}<span className="text-xs">/100</span></p></div>
                  </div>
                </div>
                <p className="mt-6 text-base font-semibold leading-8 text-slate-800">{idea.thesisSummary}</p>
              </div>

              <div className="grid gap-6 p-6 md:grid-cols-2 md:p-8">
                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-black text-slate-950">A) {isEquity ? (isEnglish ? "Fundamental mathematics" : "Temel matematik") : (isEnglish ? "Macro / asset fundamentals" : "Makro / varlık temeli")}</h3>
                  {isEquity ? (
                    <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      <Metric label="FCF büyüme" value={percent(fundamental?.freeCashFlowGrowthPct)} />
                      <Metric label="Gelir büyüme" value={percent(fundamental?.revenueGrowthPct)} />
                      <Metric label="Net marj" value={plainPercent(fundamental?.netMarginPct)} />
                      <Metric label="Marj genişleme" value={`${number(fundamental?.netMarginExpansionBps, 0)} bp`} />
                      <Metric label="Borç / varlık" value={plainPercent(fundamental?.debtToAssetsPct)} />
                      <Metric label="Borç / FCF" value={`${number(fundamental?.debtToFreeCashFlow)}x`} />
                      <Metric label="Ar-Ge büyüme" value={percent(fundamental?.researchAndDevelopmentGrowthPct)} />
                    </dl>
                  ) : (
                    <dl className="mt-4 grid grid-cols-2 gap-3">
                      <Metric label={isEnglish ? "Asset class" : "Varlık sınıfı"} value={assetClassLabel(idea.assetClass, isEnglish)} />
                      <Metric label={isEnglish ? "Corporate metrics" : "Şirket metrikleri"} value={isEnglish ? "Not applicable" : "Uygulanamaz"} />
                    </dl>
                  )}
                  <p className="mt-4 text-sm leading-7 text-slate-700">{idea.fundamentalThesis}</p>
                </section>

                <section className="rounded-2xl border border-slate-200 bg-white p-5">
                  <h3 className="font-black text-slate-950">B) {isEnglish ? "Institutional technicals" : "Kurumsal teknik"}</h3>
                  <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <Metric label="Fiyat" value={number(idea.priceAtRecommendation)} />
                    <Metric label="SMA 50" value={number(technical?.sma50)} />
                    <Metric label="SMA 200" value={number(technical?.sma200)} />
                    <Metric label="RSI 14" value={number(technical?.rsi14)} />
                    <Metric label="Hacim / 20g" value={`${number(technical?.volumeRatio20d)}x`} />
                    <Metric label="Hacimli kırılım" value={technical?.volumeBreakout ? "EVET" : "HAYIR"} />
                    <Metric label="Momentum 20g" value={percent(technical?.momentum20dPct)} />
                    <Metric label="Momentum 60g" value={percent(technical?.momentum60dPct)} />
                    <Metric label="RSI uyumsuzluk" value={technical?.rsiDivergence ?? "-"} />
                    <Metric label="MACD uyumsuzluk" value={technical?.macdDivergence ?? "-"} />
                    <Metric label="ATR 14" value={plainPercent(technical?.atr14Pct)} />
                    <Metric label="Crowding" value={`${number(technical?.crowdingScore, 0)}/100 · ${crowdingLabel(technical?.crowdingLevel, isEnglish)}`} />
                  </dl>
                  <p className="mt-4 text-sm leading-7 text-slate-700">{idea.technicalThesis}</p>
                  {asStringArray(technical?.crowdingSignals).length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{asStringArray(technical?.crowdingSignals).map((signal) => <span key={signal} className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-800">{signal.replaceAll("_", " ")}</span>)}</div> : null}
                </section>

                <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <h3 className="font-black text-amber-950">{isEnglish ? "Unpriced catalysts · 3-12 months" : "Fiyatlanmamış katalizörler · 3-12 ay"}</h3>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-amber-950">{asStringArray(idea.catalysts).map((item) => <li key={item}>• {item}</li>)}</ul>
                  <p className="mt-4 text-sm leading-7 text-amber-950"><strong>Makro:</strong> {idea.macroThesis}</p>
                </section>

                <section className="rounded-2xl border border-slate-300 bg-slate-900 p-5 text-white">
                  <h3 className="font-black text-white">{isEnglish ? "Objective escape plan" : "Objektif kaçış planı"}</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div><p className="text-[10px] font-black uppercase text-slate-400">Giriş</p><p className="font-black">{number(idea.entryLow)}-{number(idea.entryHigh)}</p></div>
                    <div><p className="text-[10px] font-black uppercase text-slate-400">Stop</p><p className="font-black text-rose-300">{number(idea.stopLoss)}</p></div>
                    <div><p className="text-[10px] font-black uppercase text-slate-400">Hedef 1</p><p className="font-black text-emerald-300">{number(idea.targetPrice)}</p></div>
                    <div><p className="text-[10px] font-black uppercase text-slate-400">Hedef 2</p><p className="font-black text-emerald-300">{number(idea.secondaryTargetPrice)}</p></div>
                  </div>
                  <p className="mt-5 text-sm leading-7 text-slate-200">{idea.exitPlan}</p>
                  <p className="mt-4 rounded-xl border border-rose-300/20 bg-rose-300/10 p-3 text-sm leading-6 text-rose-100"><strong>{isEnglish ? "Negative case:" : "Olumsuz tez:"}</strong> {idea.negativeCase}</p>
                </section>
              </div>

              <div className="grid gap-5 border-t border-slate-200 bg-white p-6 md:grid-cols-2 md:p-8">
                <section>
                  <h3 className="font-black text-slate-950">{isEquity ? (isEnglish ? "Institutional perception & short data" : "Kurumsal algı ve short verisi") : (isEnglish ? "Positioning data discipline" : "Pozisyonlanma verisi disiplini")}</h3>
                  <p className="mt-3 text-sm leading-7 text-slate-700">{idea.institutionalPerception}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-700">{idea.shortInterestCommentary}</p>
                  {isEquity ? <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-slate-600">
                    <span className="rounded-full bg-slate-100 px-3 py-1">Kurumsal sahiplik {plainPercent(institutional?.ownershipPercent)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Short değişim {percent(shortInterest?.changePercent)}</span>
                    <span className="rounded-full bg-slate-100 px-3 py-1">Days to cover {number(shortInterest?.daysToCover)}</span>
                  </div> : null}
                </section>
                <section>
                  <h3 className="font-black text-slate-950">{isEnglish ? "Sources" : "Kaynaklar"}</h3>
                  <ul className="mt-3 space-y-2 text-sm">{sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="font-bold text-teal-700 underline decoration-teal-300 underline-offset-4">{source.title}</a></li>)}</ul>
                </section>
              </div>

              <div className="border-t border-slate-200 bg-slate-100 p-6 md:p-8">
                <h3 className="font-black text-slate-950">{isEnglish ? "Audited performance after recommendation" : "Öneri sonrası denetlenebilir performans"}</h3>
                <p className="mt-1 text-xs text-slate-500">{isEnglish ? "Return is split-adjusted price return measured from the report reference price; dividends are excluded." : "Getiri, rapor referans fiyatından ölçülen ve hisse bölünmelerine göre düzeltilen fiyat getirisidir; temettüler dahil değildir."}</p>
                <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
                  {horizons.map((horizon) => {
                    const evaluation = idea.evaluations.find((item) => item.horizon === horizon);
                    const ready = evaluation?.status === "COMPLETED";
                    return <div key={horizon} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs font-black uppercase text-slate-500">{horizon}</p><p className={`mt-2 text-2xl font-black ${ready && (evaluation?.returnPercent ?? 0) >= 0 ? "text-emerald-700" : ready ? "text-rose-700" : "text-slate-400"}`}>{ready ? percent(evaluation?.returnPercent) : isEnglish ? "Pending" : "Bekliyor"}</p><p className="mt-1 text-xs text-slate-500">{ready ? `Fiyat ${number(evaluation?.priceAtEvaluation)}` : evaluation ? new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", { dateStyle: "medium" }).format(evaluation.dueAt) : "-"}</p></div>;
                  })}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-black text-slate-950">{isEnglish ? "Final scorecard" : "Nihai karne"}</h2></div>
        <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">#</th><th className="px-5 py-3">Varlık</th><th className="px-5 py-3">Tür</th><th className="px-5 py-3">Not</th><th className="px-5 py-3">Güven</th><th className="px-5 py-3">Risk</th><th className="px-5 py-3">Giriş</th><th className="px-5 py-3">Stop</th><th className="px-5 py-3">Hedef</th></tr></thead><tbody>{report.ideas.map((idea) => <tr key={idea.id} className="border-t border-slate-100"><td className="px-5 py-4 font-black">{idea.rank}</td><td className="px-5 py-4 font-black">{idea.symbol}</td><td className="px-5 py-4">{assetClassLabel(idea.assetClass, isEnglish)}</td><td className="px-5 py-4">{idea.stance}</td><td className="px-5 py-4">{idea.confidenceScore}/100</td><td className="px-5 py-4">{idea.riskScore}/100</td><td className="px-5 py-4">{number(idea.entryLow)}-{number(idea.entryHigh)}</td><td className="px-5 py-4 text-rose-700">{number(idea.stopLoss)}</td><td className="px-5 py-4 text-emerald-700">{number(idea.targetPrice)}</td></tr>)}</tbody></table></div>
      </section>

      <p className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-xs leading-6 text-slate-500">{report.disclaimer}</p>
    </div>
  );
}
