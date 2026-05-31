"use client";

import { getTopOpportunities, type OpportunityActionLabel, type TopOpportunity } from "@/lib/ai-market/opportunity-engine";
import { getSafeLocale, type Locale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import type { MarketAnalysis } from "@/lib/ai-market/types";

type TopOpportunitiesPanelProps = {
  locale: Locale | string;
  analyses: MarketAnalysis[];
  isLoading?: boolean;
  updatedAt: string | null;
};

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  if (value >= 1000) {
    return value.toLocaleString("tr-TR", { maximumFractionDigits: 2 });
  }

  if (value >= 1) {
    return value.toLocaleString("tr-TR", { maximumFractionDigits: 4 });
  }

  return value.toLocaleString("tr-TR", { maximumSignificantDigits: 4 });
}

function formatTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function getActionClass(label: OpportunityActionLabel) {
  if (label === "Güçlü Al" || label === "Yükseliş İhtimali Yüksek" || label === "Alış İçin Takip Et") {
    return "border-emerald-200 bg-emerald-50 text-emerald-800";
  }

  if (label === "Güçlü Sat" || label === "Düşüş Eğiliminde" || label === "Satış İçin Takip Et") {
    return "border-rose-200 bg-rose-50 text-rose-800";
  }

  if (label === "Kâr Al") {
    return "border-amber-200 bg-amber-50 text-amber-800";
  }

  if (label === "Riskli / Uzak Dur") {
    return "border-slate-300 bg-slate-100 text-slate-700";
  }

  return "border-slate-200 bg-white text-slate-700";
}

function getScoreClass(score: number) {
  if (score >= 80) {
    return "text-emerald-700";
  }

  if (score >= 60) {
    return "text-amber-700";
  }

  return "text-slate-500";
}

function getRiskClass(score: number) {
  if (score >= 70) {
    return "text-rose-700";
  }

  if (score >= 45) {
    return "text-amber-700";
  }

  return "text-emerald-700";
}

function translateActionLabel(label: OpportunityActionLabel, locale: Locale) {
  if (locale === "tr") {
    return label;
  }

  const labels: Record<OpportunityActionLabel, string> = {
    "Güçlü Al": "Strong Buy",
    "Yükseliş İhtimali Yüksek": "High Upside Potential",
    "Alış İçin Takip Et": "Watch to Buy",
    "Kâr Al": "Take Profit",
    "Güçlü Sat": "Strong Sell",
    "Düşüş Eğiliminde": "Downside Opportunity",
    "Satış İçin Takip Et": "Watch to Sell",
    "Riskli / Uzak Dur": "Risky / Avoid",
    "Bekle": "Hold",
  };

  return labels[label] ?? label;
}

export function TopOpportunitiesPanel({ locale, analyses, isLoading = false, updatedAt }: TopOpportunitiesPanelProps) {
  const safeLocale = getSafeLocale(locale);
  const copy = getUiCopy(safeLocale).ai;
  const opportunities = getTopOpportunities(analyses, 5);

  return (
    <section className="premium-card overflow-hidden border border-slate-200 bg-[#f8fafc]">
      <div className="flex flex-col gap-2 border-b border-slate-200 bg-white/75 p-4 md:flex-row md:items-end md:justify-between md:p-5">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{copy.terminal}</p>
          <h2 className="mt-1 text-lg font-black text-[#152033]">{safeLocale === "en" ? "Top 5 Opportunities" : "En İyi 5 Fırsat"}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs font-black text-slate-600">
          <span className="rounded-md border border-slate-200 bg-white px-3 py-2">{safeLocale === "en" ? "80+ strong signal" : "80+ güçlü sinyal"}</span>
          <span className="rounded-md border border-slate-200 bg-white px-3 py-2">{safeLocale === "en" ? "60-80 watch" : "60-80 takip"}</span>
          {updatedAt ? <span className="rounded-md border border-slate-200 bg-white px-3 py-2">{copy.updateLabel} {formatTime(updatedAt)}</span> : null}
        </div>
      </div>

      {isLoading && opportunities.length === 0 ? <LoadingState /> : null}
      {!isLoading && opportunities.length === 0 ? <EmptyState locale={safeLocale} /> : null}
      {opportunities.length > 0 ? <OpportunityCards locale={safeLocale} copy={copy} opportunities={opportunities} /> : null}
    </section>
  );
}

function OpportunityCards({ locale, copy, opportunities }: { locale: Locale; copy: ReturnType<typeof getUiCopy>["ai"]; opportunities: TopOpportunity[] }) {
  return (
    <div className="grid gap-2 p-3">
      {opportunities.map((opportunity) => (
        <OpportunityCard key={opportunity.symbol} locale={locale} copy={copy} opportunity={opportunity} />
      ))}
    </div>
  );
}

function OpportunityCard({ locale, copy, opportunity }: { locale: Locale; copy: ReturnType<typeof getUiCopy>["ai"]; opportunity: TopOpportunity }) {
  return (
    <article className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
      <div className="grid gap-3 lg:grid-cols-[minmax(150px,1.1fr)_minmax(150px,1fr)_minmax(240px,1.4fr)] lg:items-center">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-slate-50 text-xs font-black text-slate-500">
            {opportunity.rank}
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-[#152033]">{opportunity.symbol}</p>
            <p className="mt-1 truncate text-xs font-semibold text-slate-500">{opportunity.name}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-2">
          <Metric label={locale === "en" ? "Recommendation" : "Tavsiye"} value={`${opportunity.recommendationScore}/100`} className={getScoreClass(opportunity.recommendationScore)} />
          <Metric label={copy.risk} value={`${opportunity.riskScore}/100`} className={getRiskClass(opportunity.riskScore)} />
          <Metric label={copy.interval} value={opportunity.interval} />
          <Metric label={copy.price} value={formatPrice(opportunity.lastPrice)} />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-md border px-2 py-1 text-xs font-black ${getActionClass(opportunity.actionLabel)}`}>
              {translateActionLabel(opportunity.actionLabel, locale)}
            </span>
            <span className="text-xs font-bold text-slate-400">{formatTime(opportunity.updatedAt)}</span>
          </div>
          <p className="mt-2 overflow-hidden text-xs leading-5 text-slate-600 [display:-webkit-box] [-webkit-box-orient:vertical] [-webkit-line-clamp:2]">
            {opportunity.rationale}
          </p>
        </div>
      </div>
    </article>
  );
}

function Metric({ label, value, className = "text-slate-700" }: { label: string; value: string; className?: string }) {
  return (
    <div className="min-w-0 rounded-md border border-slate-100 bg-slate-50 p-2">
      <p className="truncate text-[10px] font-black uppercase tracking-[0.1em] text-slate-400">{label}</p>
      <p className={`mt-1 truncate text-xs font-black ${className}`}>{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-2 p-4">
      <div className="h-14 animate-pulse rounded-md bg-slate-100" />
      <div className="h-14 animate-pulse rounded-md bg-slate-100" />
      <div className="h-14 animate-pulse rounded-md bg-slate-100" />
    </div>
  );
}

function EmptyState({ locale }: { locale: Locale }) {
  return (
    <p className="p-4 text-sm font-semibold text-slate-500">
      {locale === "en"
        ? "No priority opportunity with a recommendation score above 60 or a notable risk signal was found."
        : "Tavsiye oranı 60 üzeri olan veya özellikle riskli görünen öncelikli fırsat bulunamadı."}
    </p>
  );
}
