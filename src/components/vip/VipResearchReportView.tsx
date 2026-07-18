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

function localeCode(locale: Locale) {
  return locale === "en" ? "en-US" : "tr-TR";
}

function number(value: number | null | undefined, locale: Locale, digits = 2) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString(localeCode(locale), { maximumFractionDigits: digits })
    : locale === "en" ? "Unavailable" : "Veri yok";
}

function percent(value: number | null | undefined, locale: Locale, signed = true) {
  return typeof value === "number" && Number.isFinite(value)
    ? `${signed && value >= 0 ? "+" : ""}${value.toLocaleString(localeCode(locale), { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
    : locale === "en" ? "Unavailable" : "Veri yok";
}

function price(value: number | null | undefined, currency: string, locale: Locale) {
  if (typeof value !== "number" || !Number.isFinite(value)) return locale === "en" ? "Unavailable" : "Veri yok";
  try {
    return new Intl.NumberFormat(localeCode(locale), { style: "currency", currency, maximumFractionDigits: 2 }).format(value);
  } catch {
    return number(value, locale);
  }
}

function assetClassLabel(assetClass: string, locale: Locale) {
  const labels: Record<VipAssetClass, [string, string]> = {
    EQUITY: ["Hisse", "Equity"],
    BROAD_MARKET: ["Geniş piyasa", "Broad market"],
    COMMODITY: ["Emtia", "Commodity"],
    BOND: ["Tahvil", "Bond"],
    FX: ["Döviz", "FX"],
    CRYPTO: ["Kripto", "Crypto"],
  };
  return labels[assetClass as VipAssetClass]?.[locale === "en" ? 1 : 0] ?? assetClass;
}

function stanceLabel(stance: string, locale: Locale) {
  if (locale === "tr") return stance.replaceAll("_", " ");
  return ({ AL: "BUY", TUT: "HOLD", IZLE: "WATCH", UZAK_DUR: "AVOID" } as Record<string, string>)[stance] ?? stance;
}

function stanceTone(stance: string) {
  if (stance === "AL") return "border-emerald-300 bg-emerald-50 text-emerald-800";
  if (stance === "UZAK_DUR") return "border-rose-300 bg-rose-50 text-rose-800";
  return "border-amber-300 bg-amber-50 text-amber-900";
}

function crowdingLabel(level: string | undefined, locale: Locale) {
  const labels: Record<string, [string, string]> = { LOW: ["Düşük", "Low"], MODERATE: ["Orta", "Moderate"], HIGH: ["Yüksek", "High"], EXTREME: ["Aşırı", "Extreme"] };
  return level ? labels[level]?.[locale === "en" ? 1 : 0] ?? level : locale === "en" ? "Unavailable" : "Veri yok";
}

function signalLabel(value: string | undefined, locale: Locale) {
  const labels: Record<string, [string, string]> = { BULLISH: ["Pozitif", "Bullish"], BEARISH: ["Negatif", "Bearish"], NONE: ["Yok", "None"] };
  return value ? labels[value]?.[locale === "en" ? 1 : 0] ?? value.replaceAll("_", " ") : locale === "en" ? "Unavailable" : "Veri yok";
}

function Metric({ label, value, emphasis = false }: { label: string; value: string; emphasis?: boolean }) {
  return <div className={`rounded-xl border px-3 py-3 ${emphasis ? "border-[#d8c486] bg-[#fff9e8]" : "border-slate-200 bg-white"}`}><dt className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">{label}</dt><dd className="mt-1 text-sm font-bold tabular-nums text-slate-950">{value}</dd></div>;
}

function SegmentedScore({ value, kind, locale }: { value: number; kind: "confidence" | "risk"; locale: Locale }) {
  const safe = Math.max(0, Math.min(100, value));
  const filled = Math.ceil(safe / 10);
  const isConfidence = kind === "confidence";
  const grade = safe >= 80
    ? (isConfidence ? (locale === "en" ? "High confidence" : "Yüksek güven") : (locale === "en" ? "High risk" : "Yüksek risk"))
    : safe >= 60
      ? (isConfidence ? (locale === "en" ? "Measured confidence" : "Ölçülü güven") : (locale === "en" ? "Elevated risk" : "Yükselmiş risk"))
      : (isConfidence ? (locale === "en" ? "Limited confidence" : "Sınırlı güven") : (locale === "en" ? "Controlled risk" : "Kontrollü risk"));
  const active = isConfidence ? "bg-emerald-500" : safe >= 70 ? "bg-rose-500" : "bg-amber-500";
  return <div className="rounded-2xl border border-slate-200 bg-white p-4"><div className="flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500">{isConfidence ? (locale === "en" ? "Confidence" : "Güven") : locale === "en" ? "Risk" : "Risk"}</p><p className="mt-1 text-sm font-semibold text-slate-700">{grade}</p></div><p className="text-2xl font-bold tabular-nums text-slate-950">{safe}<span className="text-xs font-medium text-slate-400">/100</span></p></div><div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe} className="mt-3 grid grid-cols-10 gap-1">{Array.from({ length: 10 }, (_, index) => <span key={index} className={`h-2 rounded-full ${index < filled ? active : "bg-slate-200"}`}/>)}</div></div>;
}

function PriceAxis({ idea, locale }: { idea: Idea; locale: Locale }) {
  const points = [idea.stopLoss, idea.entryLow, idea.entryHigh, idea.priceAtRecommendation, idea.targetPrice, idea.secondaryTargetPrice].filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (points.length < 2 || Math.max(...points) <= Math.min(...points)) return <p className="mt-4 text-sm text-slate-400">{locale === "en" ? "Price-axis data unavailable." : "Fiyat ekseni için veri yok."}</p>;
  const low = Math.min(...points);
  const high = Math.max(...points);
  const location = (value: number) => Math.min(98, Math.max(2, ((value - low) / (high - low)) * 100));
  const entryLeft = location(Math.min(idea.entryLow, idea.entryHigh));
  const entryWidth = Math.max(1, location(Math.max(idea.entryLow, idea.entryHigh)) - entryLeft);
  const markers = [
    { key: "stop", label: "Stop", value: idea.stopLoss, color: "bg-rose-500", text: "text-rose-700" },
    { key: "current", label: locale === "en" ? "Reference" : "Referans", value: idea.priceAtRecommendation, color: "bg-slate-800", text: "text-slate-700" },
    { key: "target", label: locale === "en" ? "Target 1" : "Hedef 1", value: idea.targetPrice, color: "bg-emerald-500", text: "text-emerald-700" },
    ...(idea.secondaryTargetPrice === null ? [] : [{ key: "target2", label: locale === "en" ? "Target 2" : "Hedef 2", value: idea.secondaryTargetPrice, color: "bg-teal-500", text: "text-teal-700" }]),
  ];
  return <div className="mt-5"><div className="relative h-3 rounded-full bg-gradient-to-r from-rose-200 via-amber-100 to-emerald-200"><span className="absolute top-0 h-3 rounded-full bg-[#e7c977]/80 ring-2 ring-white" style={{ left: `${entryLeft}%`, width: `${entryWidth}%` }}/>{markers.map((marker) => <span key={marker.key} className={`absolute top-1/2 h-5 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${marker.color}`} style={{ left: `${location(marker.value)}%` }}/>)}</div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-amber-700">{locale === "en" ? "Entry range" : "Giriş bandı"}</p><p className="text-xs font-bold tabular-nums text-slate-950">{price(idea.entryLow, idea.currency, locale)} – {price(idea.entryHigh, idea.currency, locale)}</p></div>{markers.map((marker) => <div key={marker.key}><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{marker.label}</p><p className={`text-xs font-bold tabular-nums ${marker.text}`}>{price(marker.value, idea.currency, locale)}</p></div>)}</div></div>;
}

function EvaluationTimeline({ evaluations, currency, locale }: { evaluations: Evaluation[]; currency: string; locale: Locale }) {
  const now = new Date();
  return <ol className="relative mt-5 grid gap-3 md:grid-cols-4 before:absolute before:left-[12.5%] before:right-[12.5%] before:top-5 before:hidden before:h-px before:bg-slate-300 md:before:block">{horizons.map((horizon) => {
    const evaluation = evaluations.find((item) => item.horizon === horizon);
    const ready = evaluation?.status === "COMPLETED";
    const days = evaluation ? Math.ceil((evaluation.dueAt.getTime() - now.getTime()) / 86_400_000) : null;
    const pendingLabel = days === null ? (locale === "en" ? "No schedule" : "Takvim yok") : days > 0 ? (locale === "en" ? `${days} days remaining` : `${days} gün kaldı`) : (locale === "en" ? "Awaiting evaluation" : "Değerlendirme bekliyor");
    return <li key={horizon} className="relative rounded-2xl border border-slate-200 bg-white p-4"><span className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-4 border-white text-xs font-bold ${ready ? "bg-[#0b1526] text-[#f3dda0]" : "bg-slate-200 text-slate-600"}`}>{horizon}</span><p className={`mt-3 text-2xl font-bold tabular-nums ${ready && (evaluation?.returnPercent ?? 0) >= 0 ? "text-emerald-600" : ready ? "text-rose-600" : "text-slate-400"}`}>{ready ? percent(evaluation?.returnPercent, locale) : locale === "en" ? "Pending" : "Bekliyor"}</p><p className="mt-1 text-xs leading-5 text-slate-500">{ready ? `${locale === "en" ? "Evaluated price" : "Ölçülen fiyat"}: ${price(evaluation?.priceAtEvaluation, currency, locale)}` : pendingLabel}</p>{evaluation ? <time dateTime={evaluation.dueAt.toISOString()} className="mt-1 block text-[10px] font-medium text-slate-400">{new Intl.DateTimeFormat(localeCode(locale), { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(evaluation.dueAt)}</time> : null}</li>;
  })}</ol>;
}

function sourceDetails(source: VipSource, locale: Locale) {
  try {
    const host = new URL(source.url).hostname.replace(/^www\./, "");
    const official = host.endsWith(".gov") || host === "gov.uk";
    const date = source.publishedAt && !Number.isNaN(new Date(source.publishedAt).getTime())
      ? new Intl.DateTimeFormat(localeCode(locale), { dateStyle: "medium" }).format(new Date(source.publishedAt))
      : null;
    return { host, official, date };
  } catch {
    return { host: locale === "en" ? "External source" : "Harici kaynak", official: false, date: null };
  }
}

function Sources({ sources, locale }: { sources: VipSource[]; locale: Locale }) {
  if (sources.length === 0) return <p className="mt-3 text-sm text-slate-500">{locale === "en" ? "No source links are available for this idea." : "Bu fikir için kaynak bağlantısı bulunmuyor."}</p>;
  return <ul className="mt-4 space-y-3">{sources.map((source) => { const meta = sourceDetails(source, locale); return <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="group flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3 transition hover:border-[#d8c486] hover:bg-[#fff9e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><span><span className="block text-sm font-semibold leading-5 text-slate-900 group-hover:text-amber-900">{source.title}</span><span className="mt-1 flex flex-wrap items-center gap-2 text-[10px] font-medium text-slate-500"><span>{meta.host}</span>{meta.date ? <span>· {meta.date}</span> : null}{meta.official ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 font-semibold text-emerald-800">{locale === "en" ? "Official source" : "Resmi kaynak"}</span> : null}</span></span><span aria-hidden="true" className="text-slate-400 transition group-hover:text-amber-700">↗</span></a></li>; })}</ul>;
}

export function VipResearchReportView({ report, locale, showArchiveLink = false }: { report: Report; locale: Locale; showArchiveLink?: boolean }) {
  const isEnglish = locale === "en";
  const date = new Intl.DateTimeFormat(localeCode(locale), { dateStyle: "long", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(report.generatedAt);
  return <div className="space-y-7">
    <header id="report-top" className="scroll-mt-24 overflow-hidden rounded-[2rem] border border-[#e7c977]/30 bg-[radial-gradient(circle_at_85%_8%,rgba(231,201,119,0.16),transparent_30%),linear-gradient(145deg,#07111f,#101d32)] p-7 text-white shadow-[0_30px_90px_rgba(2,8,23,0.24)] md:p-10"><div className="flex flex-wrap items-start justify-between gap-5"><div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-[#e7c977]/35 bg-[#e7c977]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.15em] text-[#f3dda0]">Enbilir VIP</span><span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-200">07:00 Europe/Istanbul</span></div><p className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-[#e7c977]">{isEnglish ? "Asymmetric research" : "Asimetrik araştırma"}</p><h1 className="mt-2 text-4xl font-bold tracking-tight md:text-6xl">{isEnglish ? "Institutional morning scorecard" : "Kurumsal sabah karnesi"}</h1><p className="mt-3 text-sm font-medium text-slate-300">{date}</p></div>{showArchiveLink ? <Link href={`/${locale}/vip#report-archive`} className="rounded-xl border border-white/20 bg-white/8 px-4 py-2.5 text-sm font-semibold transition hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c977]">← {isEnglish ? "VIP archive" : "VIP arşivi"}</Link> : null}</div><p className="mt-7 max-w-5xl text-base leading-8 text-slate-200">{report.executiveSummary}</p>{report.fallbackUsed ? <p className="mt-5 rounded-2xl border border-amber-300/35 bg-amber-300/10 px-4 py-3 text-sm font-medium leading-6 text-amber-100">{isEnglish ? "Catalyst research was incomplete; this edition remains in quantitative watch-only mode." : "Katalizör araştırması tamamlanamadı; bu baskı nicel izleme modundadır ve AL notu üretmez."}</p> : null}</header>

    <nav className="sticky top-20 z-30 overflow-x-auto rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-lg backdrop-blur" aria-label={isEnglish ? "Report sections" : "Rapor bölümleri"}><div className="flex min-w-max items-center gap-1"><a href="#macro" className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">{isEnglish ? "Macro frame" : "Makro çerçeve"}</a>{report.ideas.map((idea) => <a key={idea.id} href={`#idea-${idea.id}`} className="rounded-xl px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">#{idea.rank} {idea.symbol}</a>)}<a href="#final-scorecard" className="rounded-xl bg-[#0b1526] px-3 py-2 text-xs font-semibold text-[#f3dda0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">{isEnglish ? "Final scorecard" : "Nihai karne"}</a></div></nav>

    <section id="macro" className="scroll-mt-40 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm md:p-7"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">{isEnglish ? "Macro frame" : "Makro çerçeve"}</p><p className="mt-4 whitespace-pre-line text-sm leading-7 text-slate-700">{report.marketContext}</p></section>

    <div className="space-y-8">{report.ideas.map((idea) => {
      const fundamental = asSnapshot<VipFundamentalSnapshot>(idea.fundamentalSnapshot);
      const technical = asSnapshot<VipTechnicalSnapshot>(idea.technicalSnapshot);
      const institutional = asSnapshot<VipInstitutionalSnapshot>(idea.institutionalSnapshot);
      const shortInterest = asSnapshot<VipShortInterestSnapshot>(idea.shortInterestSnapshot);
      const sources = asSources(idea.sources);
      const isEquity = idea.assetClass === "EQUITY";
      return <article id={`idea-${idea.id}`} key={idea.id} className="scroll-mt-40 overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-50 shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-200 bg-white p-6 md:p-8"><div className="grid gap-6 lg:grid-cols-[1fr_360px]"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-700">#{idea.rank} · {isEnglish ? "Asymmetric rank" : "Asimetrik sıralama"}</p><h2 className="mt-2 text-4xl font-bold tracking-tight text-slate-950">{idea.symbol} <span className="block text-base font-medium text-slate-500 sm:inline">{idea.displayName}</span></h2><div className="mt-4 flex flex-wrap gap-2"><span className={`inline-flex rounded-full border px-3 py-1.5 text-xs font-bold ${stanceTone(idea.stance)}`}>{stanceLabel(idea.stance, locale)}</span><span className="inline-flex rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700">{assetClassLabel(idea.assetClass, locale)} · {idea.currency}</span><span className="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-800">{isEnglish ? "Crowding" : "Kalabalık"} {number(technical?.crowdingScore, locale, 0)}/100 · {crowdingLabel(technical?.crowdingLevel, locale)}</span></div><p className="mt-6 text-base font-medium leading-8 text-slate-800">{idea.thesisSummary}</p></div><div className="grid grid-cols-2 gap-3"><SegmentedScore value={idea.confidenceScore} kind="confidence" locale={locale}/><SegmentedScore value={idea.riskScore} kind="risk" locale={locale}/></div></div></div>

        <div className="grid gap-5 p-6 lg:grid-cols-2 md:p-8">
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700">A · {isEnglish ? "Mathematical gate" : "Matematiksel kapı"}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{isEquity ? (isEnglish ? "Fundamental quality" : "Temel kalite") : (isEnglish ? "Macro / asset fundamentals" : "Makro / varlık temeli")}</h3>{isEquity ? <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label={isEnglish ? "FCF growth" : "FCF büyüme"} value={percent(fundamental?.freeCashFlowGrowthPct, locale)}/><Metric label={isEnglish ? "Revenue growth" : "Gelir büyüme"} value={percent(fundamental?.revenueGrowthPct, locale)}/><Metric label={isEnglish ? "Net margin" : "Net marj"} value={percent(fundamental?.netMarginPct, locale, false)}/><Metric label={isEnglish ? "Margin expansion" : "Marj genişleme"} value={typeof fundamental?.netMarginExpansionBps === "number" ? `${number(fundamental.netMarginExpansionBps, locale, 0)} bp` : isEnglish ? "Unavailable" : "Veri yok"}/><Metric label={isEnglish ? "Debt / assets" : "Borç / varlık"} value={percent(fundamental?.debtToAssetsPct, locale, false)}/><Metric label={isEnglish ? "Debt / FCF" : "Borç / FCF"} value={typeof fundamental?.debtToFreeCashFlow === "number" ? `${number(fundamental.debtToFreeCashFlow, locale)}x` : isEnglish ? "Unavailable" : "Veri yok"}/><Metric label={isEnglish ? "R&D growth" : "Ar-Ge büyüme"} value={percent(fundamental?.researchAndDevelopmentGrowthPct, locale)}/></dl> : <dl className="mt-5 grid grid-cols-2 gap-3"><Metric label={isEnglish ? "Asset class" : "Varlık sınıfı"} value={assetClassLabel(idea.assetClass, locale)}/><Metric label={isEnglish ? "Corporate metrics" : "Şirket metrikleri"} value={isEnglish ? "Not applicable" : "Uygulanamaz"}/></dl>}<p className="mt-5 text-sm leading-7 text-slate-700">{idea.fundamentalThesis}</p></section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700">B · {isEnglish ? "Institutional gate" : "Kurumsal kapı"}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{isEnglish ? "Technical structure" : "Teknik yapı"}</h3><div className="mt-5 space-y-4"><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{isEnglish ? "Trend & price" : "Trend ve fiyat"}</p><dl className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label={isEnglish ? "Reference" : "Referans"} value={price(idea.priceAtRecommendation, idea.currency, locale)} emphasis/><Metric label="SMA 50" value={price(technical?.sma50, idea.currency, locale)}/><Metric label="SMA 200" value={price(technical?.sma200, idea.currency, locale)}/><Metric label={isEnglish ? "Volume / 20d" : "Hacim / 20g"} value={typeof technical?.volumeRatio20d === "number" ? `${number(technical.volumeRatio20d, locale)}x` : isEnglish ? "Unavailable" : "Veri yok"}/></dl></div><div><p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">{isEnglish ? "Momentum & divergence" : "Momentum ve uyumsuzluk"}</p><dl className="grid grid-cols-2 gap-2 sm:grid-cols-4"><Metric label="RSI 14" value={number(technical?.rsi14, locale)}/><Metric label="RSI divergence" value={signalLabel(technical?.rsiDivergence, locale)}/><Metric label="MACD divergence" value={signalLabel(technical?.macdDivergence, locale)}/><Metric label="ATR 14" value={percent(technical?.atr14Pct, locale, false)}/><Metric label={isEnglish ? "Momentum 20d" : "Momentum 20g"} value={percent(technical?.momentum20dPct, locale)}/><Metric label={isEnglish ? "Momentum 60d" : "Momentum 60g"} value={percent(technical?.momentum60dPct, locale)}/><Metric label={isEnglish ? "Volume breakout" : "Hacimli kırılım"} value={technical ? (technical.volumeBreakout ? (isEnglish ? "YES" : "EVET") : (isEnglish ? "NO" : "HAYIR")) : isEnglish ? "Unavailable" : "Veri yok"}/><Metric label={isEnglish ? "Crowding" : "Kalabalık"} value={`${number(technical?.crowdingScore, locale, 0)}/100`}/></dl></div></div><p className="mt-5 text-sm leading-7 text-slate-700">{idea.technicalThesis}</p>{asStringArray(technical?.crowdingSignals).length > 0 ? <div className="mt-3 flex flex-wrap gap-2">{asStringArray(technical?.crowdingSignals).map((signal) => <span key={signal} className="rounded-full bg-violet-50 px-3 py-1 text-[11px] font-semibold text-violet-800">{signalLabel(signal, locale)}</span>)}</div> : null}</section>

          <section className="rounded-2xl border border-[#d8c486] bg-[#fff9e8] p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700">{isEnglish ? "3–12 month horizon" : "3–12 aylık ufuk"}</p><h3 className="mt-1 text-xl font-bold text-amber-950">{isEnglish ? "Unpriced catalysts" : "Fiyatlanmamış katalizörler"}</h3>{asStringArray(idea.catalysts).length ? <ul className="mt-4 space-y-3 text-sm leading-6 text-amber-950">{asStringArray(idea.catalysts).map((item) => <li key={item} className="flex gap-3"><span aria-hidden="true" className="text-amber-600">◆</span><span>{item}</span></li>)}</ul> : <p className="mt-4 text-sm text-amber-900">{isEnglish ? "No catalyst evidence was available." : "Katalizör kanıtı bulunamadı."}</p>}<p className="mt-5 border-t border-amber-200 pt-4 text-sm leading-7 text-amber-950"><strong>{isEnglish ? "Macro link:" : "Makro bağ:"}</strong> {idea.macroThesis}</p></section>

          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-5"><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-rose-700">{isEnglish ? "Mandatory counter-case" : "Zorunlu karşı tez"}</p><h3 className="mt-1 text-xl font-bold text-rose-950">{isEnglish ? "What can break the idea?" : "Fikri ne bozabilir?"}</h3><p className="mt-4 text-sm leading-7 text-rose-950">{idea.negativeCase}</p></section>
        </div>

        <section className="border-y border-slate-700 bg-[#0b1526] p-6 text-white md:p-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e7c977]">{isEnglish ? "Objective escape plan" : "Objektif kaçış planı"}</p><h3 className="mt-1 text-2xl font-bold">{isEnglish ? "Entry, invalidation and targets" : "Giriş, tez iptali ve hedefler"}</h3></div><span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-xs font-semibold text-slate-200">{idea.currency}</span></div><div className="mt-5 rounded-2xl bg-white p-5 text-slate-950"><PriceAxis idea={idea} locale={locale}/></div><p className="mt-5 max-w-5xl text-sm leading-7 text-slate-200">{idea.exitPlan}</p></section>

        <div className="grid gap-5 bg-white p-6 lg:grid-cols-2 md:p-8"><section><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700">{isEnglish ? "Positioning" : "Pozisyonlanma"}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{isEquity ? (isEnglish ? "Institutional perception & short data" : "Kurumsal algı ve short verisi") : (isEnglish ? "Positioning data discipline" : "Pozisyonlanma verisi disiplini")}</h3><p className="mt-4 text-sm leading-7 text-slate-700">{idea.institutionalPerception}</p><p className="mt-2 text-sm leading-7 text-slate-700">{idea.shortInterestCommentary}</p>{isEquity ? <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3"><Metric label={isEnglish ? "Institutional ownership" : "Kurumsal sahiplik"} value={percent(institutional?.ownershipPercent, locale, false)}/><Metric label={isEnglish ? "Short change" : "Short değişim"} value={percent(shortInterest?.changePercent, locale)}/><Metric label={isEnglish ? "Days to cover" : "Kapanma günü"} value={number(shortInterest?.daysToCover, locale)}/></dl> : null}</section><section><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-amber-700">{isEnglish ? "Evidence trail" : "Kanıt izi"}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{isEnglish ? "Sources" : "Kaynaklar"}</h3><Sources sources={sources} locale={locale}/></section></div>

        <section className="border-t border-slate-200 bg-slate-100 p-6 md:p-8"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">{isEnglish ? "Measured outcome" : "Ölçülen sonuç"}</p><h3 className="mt-1 text-xl font-bold text-slate-950">{isEnglish ? "Audited performance after recommendation" : "Öneri sonrası denetlenebilir performans"}</h3><p className="mt-2 text-xs leading-5 text-slate-500">{isEnglish ? "Split-adjusted price return from the report reference price; dividends are excluded." : "Rapor referans fiyatından ölçülen, bölünmeye göre düzeltilmiş fiyat getirisidir; temettüler dahil değildir."}</p><EvaluationTimeline evaluations={idea.evaluations} currency={idea.currency} locale={locale}/></section>
      </article>;
    })}</div>

    <section id="final-scorecard" className="scroll-mt-40 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm"><div className="border-b border-slate-200 px-6 py-5"><p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">{isEnglish ? "Decision summary" : "Karar özeti"}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{isEnglish ? "Final scorecard" : "Nihai karne"}</h2></div><div className="space-y-3 p-4 md:hidden">{report.ideas.map((idea) => <article key={idea.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold text-amber-700">#{idea.rank}</p><h3 className="text-xl font-bold text-slate-950">{idea.symbol}</h3><p className="text-xs text-slate-500">{assetClassLabel(idea.assetClass, locale)}</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${stanceTone(idea.stance)}`}>{stanceLabel(idea.stance, locale)}</span></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">{isEnglish ? "Confidence / risk" : "Güven / risk"}</dt><dd className="font-bold tabular-nums text-slate-950">{idea.confidenceScore} / {idea.riskScore}</dd></div><div><dt className="text-slate-500">{isEnglish ? "Entry" : "Giriş"}</dt><dd className="font-bold tabular-nums text-slate-950">{price(idea.entryLow, idea.currency, locale)} – {price(idea.entryHigh, idea.currency, locale)}</dd></div><div><dt className="text-slate-500">Stop</dt><dd className="font-bold tabular-nums text-rose-700">{price(idea.stopLoss, idea.currency, locale)}</dd></div><div><dt className="text-slate-500">{isEnglish ? "Target" : "Hedef"}</dt><dd className="font-bold tabular-nums text-emerald-700">{price(idea.targetPrice, idea.currency, locale)}</dd></div></dl></article>)}</div><div className="hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3">#</th><th className="sticky left-0 bg-slate-100 px-5 py-3">{isEnglish ? "Asset" : "Varlık"}</th><th className="px-5 py-3">{isEnglish ? "Type" : "Tür"}</th><th className="px-5 py-3">{isEnglish ? "Stance" : "Not"}</th><th className="px-5 py-3">{isEnglish ? "Confidence" : "Güven"}</th><th className="px-5 py-3">{isEnglish ? "Risk" : "Risk"}</th><th className="px-5 py-3">{isEnglish ? "Entry" : "Giriş"}</th><th className="px-5 py-3">Stop</th><th className="px-5 py-3">{isEnglish ? "Target" : "Hedef"}</th></tr></thead><tbody>{report.ideas.map((idea) => <tr key={idea.id} className="border-t border-slate-100"><td className="px-5 py-4 font-bold">{idea.rank}</td><td className="sticky left-0 bg-white px-5 py-4 font-bold text-slate-950">{idea.symbol}</td><td className="px-5 py-4">{assetClassLabel(idea.assetClass, locale)}</td><td className="px-5 py-4"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${stanceTone(idea.stance)}`}>{stanceLabel(idea.stance, locale)}</span></td><td className="px-5 py-4 tabular-nums">{idea.confidenceScore}/100</td><td className="px-5 py-4 tabular-nums">{idea.riskScore}/100</td><td className="whitespace-nowrap px-5 py-4 tabular-nums">{price(idea.entryLow, idea.currency, locale)} – {price(idea.entryHigh, idea.currency, locale)}</td><td className="px-5 py-4 font-semibold tabular-nums text-rose-700">{price(idea.stopLoss, idea.currency, locale)}</td><td className="px-5 py-4 font-semibold tabular-nums text-emerald-700">{price(idea.targetPrice, idea.currency, locale)}</td></tr>)}</tbody></table></div></section>

    <p className="rounded-2xl border border-[#d8c486]/60 bg-[#fff9e8] p-5 text-xs leading-6 text-slate-700"><strong className="text-slate-950">{isEnglish ? "Disclosure:" : "Açıklama:"}</strong> {report.disclaimer}</p>
  </div>;
}
