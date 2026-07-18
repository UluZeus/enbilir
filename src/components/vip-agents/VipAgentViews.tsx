import Link from "next/link";
import type { getVipAgentDetail, getVipAgentSummaries } from "@/lib/vip-agents/dashboard";

type AgentSummary = Awaited<ReturnType<typeof getVipAgentSummaries>>[number];
type AgentDetail = NonNullable<Awaited<ReturnType<typeof getVipAgentDetail>>>;
type AgentHistoryPagination = AgentDetail["tradePagination"];
type Locale = "tr" | "en";

const agentIdentity = {
  sabit: {
    eyebrowTr: "Sermaye koruma",
    eyebrowEn: "Capital preservation",
    profileTr: "Muhafazakâr",
    profileEn: "Conservative",
    descriptionTr: "Yüksek güven, düşük risk ve güçlü nakit koruması arar. Portföy yoğunlaşmasını sıkı biçimde sınırlar.",
    descriptionEn: "Seeks high confidence, lower risk and strong cash protection. It strictly limits portfolio concentration.",
    accent: "text-sky-300",
    soft: "border-sky-300/25 bg-sky-300/10 text-sky-100",
    light: "border-sky-200 bg-sky-50 text-sky-950",
    line: "#38bdf8",
    glyph: "shield",
  },
  olgun: {
    eyebrowTr: "Dengeli bileşik getiri",
    eyebrowEn: "Balanced compounding",
    profileTr: "Dengeli",
    profileEn: "Balanced",
    descriptionTr: "Güven, risk ve çeşitlendirme arasında denge kurar. Makul fiyat sapmalarına sınırlı tolerans gösterir.",
    descriptionEn: "Balances confidence, risk and diversification, with limited tolerance for reasonable price deviations.",
    accent: "text-teal-300",
    soft: "border-teal-300/25 bg-teal-300/10 text-teal-100",
    light: "border-teal-200 bg-teal-50 text-teal-950",
    line: "#2dd4bf",
    glyph: "balance",
  },
  yildirim: {
    eyebrowTr: "Yüksek asimetri",
    eyebrowEn: "High asymmetry",
    profileTr: "Agresif",
    profileEn: "Aggressive",
    descriptionTr: "Yüksek asimetri için daha geniş risk aralığını kabul eder; yine de VIP stop ve hedef disiplininden ayrılmaz.",
    descriptionEn: "Accepts a wider risk range for greater asymmetry while remaining bound by VIP stop and target discipline.",
    accent: "text-rose-300",
    soft: "border-rose-300/25 bg-rose-300/10 text-rose-100",
    light: "border-rose-200 bg-rose-50 text-rose-950",
    line: "#fb7185",
    glyph: "bolt",
  },
} as const;

function identity(slug: string) {
  return agentIdentity[slug as keyof typeof agentIdentity] ?? agentIdentity.olgun;
}

function localizedDescription(agent: { slug: string; description: string }, locale: Locale) {
  const skin = identity(agent.slug);
  return locale === "tr" ? skin.descriptionTr : skin.descriptionEn || agent.description;
}

function money(value: number, locale: Locale, maximumFractionDigits = 0) {
  return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits,
  }).format(value);
}

function percent(value: number, locale: Locale) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}%`;
}

function compactNumber(value: number, locale: Locale, maximumFractionDigits = 4) {
  return value.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits });
}

function pnlTone(value: number) {
  return value > 0 ? "text-emerald-600" : value < 0 ? "text-rose-600" : "text-slate-500";
}

function AgentGlyph({ slug, className = "h-6 w-6" }: { slug: string; className?: string }) {
  const glyph = identity(slug).glyph;
  if (glyph === "shield") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}><path d="M12 3 5.5 5.6v5.7c0 4.3 2.7 7.8 6.5 9.7 3.8-1.9 6.5-5.4 6.5-9.7V5.6L12 3Z" stroke="currentColor" strokeWidth="1.8"/><path d="m9.2 12 1.8 1.8 3.9-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
  }
  if (glyph === "bolt") {
    return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}><path d="M13.5 2.8 5.8 13h5.7l-1 8.2L18.2 11h-5.7l1-8.2Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"/></svg>;
  }
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" className={className}><path d="M12 3v17M6 6h12M5 6l-3 6h6L5 6Zm14 0-3 6h6l-3-6ZM8 20h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

function FreshnessBadge({ value, locale }: { value: Date | null; locale: Locale }) {
  const tr = locale === "tr";
  const label = value
    ? new Intl.DateTimeFormat(tr ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(value)
    : tr ? "Henüz veri yok" : "No data yet";
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-200">
      <span className={`h-2 w-2 rounded-full ${value ? "bg-emerald-400" : "bg-slate-500"}`} />
      {tr ? "Veri" : "Data"}: {label}
    </span>
  );
}

function VirtualBadge({ locale }: { locale: Locale }) {
  return <span className="rounded-full border border-[#e7c977]/35 bg-[#e7c977]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#f3dda0]">{locale === "tr" ? "Sanal portföy" : "Virtual portfolio"}</span>;
}

function Metric({ label, value, detail, tone = "text-slate-950" }: { label: string; value: string; detail?: string; tone?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_35px_rgba(15,23,42,0.04)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <p className={`mt-2 text-xl font-bold tabular-nums ${tone}`}>{value}</p>
      {detail ? <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p> : null}
    </article>
  );
}

function EquityComparison({ agents, locale }: { agents: AgentSummary[]; locale: Locale }) {
  const tr = locale === "tr";
  const points = agents.flatMap((agent) => agent.equityHistory.map((point) => ({ ...point, slug: agent.slug })));
  if (points.length === 0) {
    return <div className="flex min-h-64 items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 text-sm text-slate-400">{tr ? "Grafik için henüz snapshot verisi yok." : "No snapshots are available for the chart yet."}</div>;
  }
  const minTime = Math.min(...points.map((point) => point.capturedAt.getTime()));
  const maxTime = Math.max(...points.map((point) => point.capturedAt.getTime()));
  const minimum = Math.min(0, ...points.map((point) => point.returnPercent));
  const maximum = Math.max(0, ...points.map((point) => point.returnPercent));
  const range = Math.max(1, maximum - minimum);
  const x = (time: number) => 68 + ((time - minTime) / Math.max(1, maxTime - minTime)) * 886;
  const y = (value: number) => 22 + ((maximum - value) / range) * 190;
  const guides = [maximum, minimum + range / 2, minimum];
  const dateLabel = (value: number) => new Intl.DateTimeFormat(tr ? "tr-TR" : "en-US", { dateStyle: "medium", timeZone: "Europe/Istanbul" }).format(new Date(value));

  return (
    <div>
      <svg viewBox="0 0 1000 250" role="img" aria-label={tr ? "VIP ajanlarının özsermaye karşılaştırması" : "VIP agent equity comparison"} className="h-auto w-full overflow-visible">
        {guides.map((guide) => <g key={guide}><line x1="68" x2="954" y1={y(guide)} y2={y(guide)} stroke="#334155" strokeDasharray="5 7"/><text x="58" y={y(guide) + 4} textAnchor="end" fill="#94a3b8" fontSize="12">{guide.toFixed(1)}%</text></g>)}
        {agents.map((agent) => {
          const line = agent.equityHistory.map((point) => `${x(point.capturedAt.getTime()).toFixed(1)},${y(point.returnPercent).toFixed(1)}`).join(" ");
          if (!line) return null;
          const last = agent.equityHistory.at(-1)!;
          return <g key={agent.id}><polyline points={line} fill="none" stroke={identity(agent.slug).line} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/><circle cx={x(last.capturedAt.getTime())} cy={y(last.returnPercent)} r="5" fill={identity(agent.slug).line}/></g>;
        })}
        <text x="68" y="240" fill="#94a3b8" fontSize="12">{dateLabel(minTime)}</text>
        <text x="954" y="240" textAnchor="end" fill="#94a3b8" fontSize="12">{dateLabel(maxTime)}</text>
      </svg>
      <div className="mt-4 flex flex-wrap gap-4">
        {agents.map((agent) => <div key={agent.id} className="flex items-center gap-2 text-xs font-semibold text-slate-300"><span className="h-2.5 w-6 rounded-full" style={{ backgroundColor: identity(agent.slug).line }} />{agent.name}<span className="tabular-nums text-white">{percent(agent.totalReturnPercent, locale)}</span></div>)}
      </div>
    </div>
  );
}

function SingleEquityChart({ agent, locale }: { agent: AgentDetail; locale: Locale }) {
  const history = agent.equityHistory;
  if (history.length === 0) return <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{locale === "tr" ? "Özsermaye grafiği için henüz veri yok." : "No equity history is available yet."}</p>;
  const minTime = Math.min(...history.map((point) => point.capturedAt.getTime()));
  const maxTime = Math.max(...history.map((point) => point.capturedAt.getTime()));
  const minimum = Math.min(0, ...history.map((point) => point.returnPercent));
  const maximum = Math.max(0, ...history.map((point) => point.returnPercent));
  const range = Math.max(1, maximum - minimum);
  const x = (time: number) => 20 + ((time - minTime) / Math.max(1, maxTime - minTime)) * 960;
  const y = (value: number) => 18 + ((maximum - value) / range) * 150;
  const polyline = history.map((point) => `${x(point.capturedAt.getTime())},${y(point.returnPercent)}`).join(" ");
  return <svg viewBox="0 0 1000 190" role="img" aria-label={locale === "tr" ? `${agent.name} özsermaye eğrisi` : `${agent.name} equity curve`} className="w-full"><defs><linearGradient id={`equity-${agent.slug}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={identity(agent.slug).line} stopOpacity=".35"/><stop offset="100%" stopColor={identity(agent.slug).line} stopOpacity="0"/></linearGradient></defs><line x1="20" x2="980" y1={y(0)} y2={y(0)} stroke="#cbd5e1" strokeDasharray="5 6"/><polygon points={`20,178 ${polyline} 980,178`} fill={`url(#equity-${agent.slug})`}/><polyline points={polyline} fill="none" stroke={identity(agent.slug).line} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"/></svg>;
}

function RiskRewardStrip({ stop, entry, current, target, currency, locale }: { stop: number; entry: number; current: number; target: number; currency: string; locale: Locale }) {
  const values = [stop, entry, current, target];
  if (values.some((value) => !Number.isFinite(value)) || Math.max(...values) <= Math.min(...values)) return <p className="mt-3 text-xs text-slate-500">{locale === "tr" ? "Risk/getiri şeridi için veri yok." : "Risk/reward data unavailable."}</p>;
  const low = Math.min(...values);
  const high = Math.max(...values);
  const position = (value: number) => Math.min(98, Math.max(2, ((value - low) / (high - low)) * 100));
  const price = (value: number) => {
    try { return new Intl.NumberFormat(locale === "tr" ? "tr-TR" : "en-US", { style: "currency", currency, maximumFractionDigits: 2 }).format(value); }
    catch { return value.toLocaleString(locale === "tr" ? "tr-TR" : "en-US", { maximumFractionDigits: 2 }); }
  };
  const markers = [
    { key: "stop", label: locale === "tr" ? "Stop" : "Stop", value: stop, color: "bg-rose-500", text: "text-rose-700" },
    { key: "entry", label: locale === "tr" ? "Maliyet" : "Cost", value: entry, color: "bg-slate-700", text: "text-slate-700" },
    { key: "current", label: locale === "tr" ? "Güncel" : "Current", value: current, color: "bg-amber-500", text: "text-amber-700" },
    { key: "target", label: locale === "tr" ? "Hedef" : "Target", value: target, color: "bg-emerald-500", text: "text-emerald-700" },
  ];
  return <div className="mt-5"><div className="relative h-2 rounded-full bg-gradient-to-r from-rose-200 via-amber-100 to-emerald-200">{markers.map((marker) => <span key={marker.key} className={`absolute top-1/2 h-4 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${marker.color}`} style={{ left: `${position(marker.value)}%` }} />)}</div><div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 sm:grid-cols-4">{markers.map((marker) => <div key={marker.key}><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{marker.label}</p><p className={`text-xs font-bold tabular-nums ${marker.text}`}>{price(marker.value)}</p></div>)}</div></div>;
}

function historyPageHref({ locale, slug, tradePage, decisionPage, anchor }: { locale: Locale; slug: string; tradePage: number; decisionPage: number; anchor: string }) {
  const query = new URLSearchParams();
  if (tradePage > 1) query.set("tradePage", String(tradePage));
  if (decisionPage > 1) query.set("decisionPage", String(decisionPage));
  const serialized = query.toString();
  return `/${locale}/vip/ajanlar/${slug}${serialized ? `?${serialized}` : ""}#${anchor}`;
}

function HistoryPagination({ pagination, kind, locale, slug, tradePage, decisionPage }: { pagination: AgentHistoryPagination; kind: "trades" | "decisions"; locale: Locale; slug: string; tradePage: number; decisionPage: number }) {
  if (pagination.totalItems === 0) return null;
  const tr = locale === "tr";
  const anchor = kind === "trades" ? "islem-gunlugu" : "karar-izi";
  const itemLabel = kind === "trades" ? (tr ? "işlem" : "trades") : (tr ? "karar" : "decisions");
  const href = (page: number) => historyPageHref({ locale, slug, tradePage: kind === "trades" ? page : tradePage, decisionPage: kind === "decisions" ? page : decisionPage, anchor });
  const control = "rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-amber-400 hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2";
  return <nav className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-5" aria-label={tr ? `${itemLabel} sayfaları` : `${itemLabel} pages`}><p className="text-xs font-medium text-slate-500"><span className="tabular-nums">{pagination.firstItem.toLocaleString(tr ? "tr-TR" : "en-US")}–{pagination.lastItem.toLocaleString(tr ? "tr-TR" : "en-US")}</span> / {pagination.totalItems.toLocaleString(tr ? "tr-TR" : "en-US")} {itemLabel} · {tr ? "Sayfa" : "Page"} {pagination.page}/{pagination.totalPages}</p>{pagination.totalPages > 1 ? <div className="flex gap-2">{pagination.hasPreviousPage ? <Link prefetch={false} href={href(pagination.page - 1)} className={control}>← {tr ? "Önceki" : "Previous"}</Link> : null}{pagination.hasNextPage ? <Link prefetch={false} href={href(pagination.page + 1)} className={control}>{tr ? "Sonraki" : "Next"} →</Link> : null}</div> : null}</nav>;
}

function decisionMeta(action: string, locale: Locale) {
  const tr = locale === "tr";
  if (action === "BUY") return { label: tr ? "AL" : "BUY", tone: "border-emerald-200 bg-emerald-50 text-emerald-800", dot: "bg-emerald-500" };
  if (action === "SELL") return { label: tr ? "SAT" : "SELL", tone: "border-rose-200 bg-rose-50 text-rose-800", dot: "bg-rose-500" };
  if (action === "HOLD") return { label: tr ? "TUT" : "HOLD", tone: "border-amber-200 bg-amber-50 text-amber-900", dot: "bg-amber-500" };
  if (action === "SUMMARY") return { label: tr ? "ÖZET" : "SUMMARY", tone: "border-sky-200 bg-sky-50 text-sky-900", dot: "bg-sky-500" };
  return { label: action, tone: "border-slate-200 bg-slate-50 text-slate-700", dot: "bg-slate-400" };
}

export function VipAgentPublicSummary({ agents, locale }: { agents: AgentSummary[]; locale: Locale }) {
  const tr = locale === "tr";
  if (agents.length === 0) return null;
  return <section className="overflow-hidden rounded-[1.75rem] border border-[#d8c486]/45 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.1)]" data-testid="public-vip-agents"><div className="border-b border-white/10 bg-[#07111f] px-6 py-6 text-white md:flex md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e7c977]">Enbilir VIP · {tr ? "Canlı sanal portföyler" : "Live virtual portfolios"}</p><h2 className="mt-2 text-2xl font-bold">{tr ? "VIP ajanlarının ölçülen performansı" : "Measured VIP agent performance"}</h2></div><Link href={`/${locale}/vip`} className="mt-4 inline-flex rounded-xl border border-[#e7c977]/60 px-4 py-2.5 text-sm font-semibold text-[#f3dda0] transition hover:bg-[#e7c977] hover:text-[#07111f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c977] md:mt-0">{tr ? "VIP detaylarını gör" : "See VIP details"}</Link></div><div className="grid md:grid-cols-3">{agents.map((agent) => { const weekly = agent.periods.find((period) => period.key === "weekly")!; const monthly = agent.periods.find((period) => period.key === "monthly")!; const skin = identity(agent.slug); return <article key={agent.id} className="border-b border-slate-200 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><div className="flex items-center justify-between gap-3"><div className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${skin.light}`}><AgentGlyph slug={agent.slug}/></div><VirtualBadge locale={locale}/></div><h3 className="mt-4 text-2xl font-bold text-slate-950">{agent.name}</h3><p className={`mt-3 text-3xl font-bold tabular-nums ${pnlTone(weekly.returnPercent)}`}>{percent(weekly.returnPercent, locale)}</p><p className="mt-1 text-sm text-slate-600">{weekly.pnlUsd >= 0 ? (tr ? `${money(weekly.pnlUsd, locale)} haftalık sonuç` : `${money(weekly.pnlUsd, locale)} weekly result`) : (tr ? `${money(Math.abs(weekly.pnlUsd), locale)} haftalık kayıp` : `${money(Math.abs(weekly.pnlUsd), locale)} weekly loss`)}</p><div className="mt-4 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2.5 text-xs"><span className="font-medium text-slate-500">{tr ? "Bu ay" : "This month"}</span><span className={`font-bold tabular-nums ${pnlTone(monthly.returnPercent)}`}>{percent(monthly.returnPercent, locale)} · {money(monthly.pnlUsd, locale)}</span></div><p className="mt-3 text-[11px] leading-5 text-slate-500">{tr ? "Yüzdeler 1.000.000 USD performans tabanındadır." : "Returns use a fixed USD 1,000,000 performance base."}</p></article>; })}</div></section>;
}

export function VipAgentOverview({ agents, locale }: { agents: AgentSummary[]; locale: Locale }) {
  const tr = locale === "tr";
  return <div className="space-y-7" data-testid="vip-agent-overview">
    <header className="overflow-hidden rounded-[2rem] border border-[#e7c977]/30 bg-[radial-gradient(circle_at_85%_10%,rgba(231,201,119,0.16),transparent_32%),linear-gradient(145deg,#07111f,#101d32)] p-7 text-white shadow-[0_30px_90px_rgba(2,8,23,0.24)] md:p-10"><div className="flex flex-wrap items-center gap-2"><VirtualBadge locale={locale}/><span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-200">{tr ? "3 risk karakteri" : "3 risk profiles"}</span></div><p className="mt-7 text-xs font-semibold uppercase tracking-[0.22em] text-[#e7c977]">Enbilir VIP · {tr ? "Otonom portföy masası" : "Autonomous portfolio desk"}</p><h1 className="mt-3 text-4xl font-bold tracking-tight md:text-6xl">SABİT · OLGUN · YILDIRIM</h1><p className="mt-5 max-w-4xl text-sm leading-7 text-slate-300 md:text-base">{tr ? "Üç ayrı risk disiplini, tek ölçüm standardı. Her ajan 1.100.000 USD toplam bakiye ile başlar; 100.000 USD koruma rezervidir ve bütün getiriler 1.000.000 USD aktif sermaye üzerinden ölçülür." : "Three distinct risk disciplines, one measurement standard. Each agent starts with USD 1,100,000; USD 100,000 is ring-fenced and all returns are measured against USD 1,000,000 of active capital."}</p></header>

    <section className="rounded-[1.75rem] border border-slate-800 bg-[#0b1526] p-5 text-white shadow-xl md:p-7"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e7c977]">{tr ? "Karşılaştırmalı özsermaye" : "Comparative equity"}</p><h2 className="mt-2 text-2xl font-bold">{tr ? "1.000.000 USD performans tabanı" : "USD 1,000,000 performance base"}</h2></div><p className="text-xs text-slate-400">{tr ? "Tüm kayıtlı snapshotlar · temettü hariç" : "All saved snapshots · dividends excluded"}</p></div><div className="mt-6"><EquityComparison agents={agents} locale={locale}/></div></section>

    <div className="grid gap-5 xl:grid-cols-3">{agents.map((agent) => { const skin = identity(agent.slug); return <article key={agent.id} className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_22px_65px_rgba(15,23,42,0.08)]"><div className="bg-[#0b1526] p-6 text-white"><div className="flex items-start justify-between gap-3"><div className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${skin.soft}`}><AgentGlyph slug={agent.slug} className="h-7 w-7"/></div><VirtualBadge locale={locale}/></div><p className={`mt-5 text-xs font-semibold uppercase tracking-[0.16em] ${skin.accent}`}>{tr ? skin.eyebrowTr : skin.eyebrowEn}</p><h2 className="mt-1 text-4xl font-bold">{agent.name}</h2><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{tr ? skin.profileTr : skin.profileEn}</p><p className="mt-3 min-h-14 text-sm leading-6 text-slate-300">{localizedDescription(agent, locale)}</p><div className="mt-5 flex flex-wrap gap-2"><FreshnessBadge value={agent.latestSnapshotAt ?? agent.lastRunAt} locale={locale}/><span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-200">{agent.openPositionCount} {tr ? "açık pozisyon" : "open positions"}</span></div></div><div className="p-6"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">{tr ? "Toplam hesap" : "Total account"}</p><p className="mt-1 text-3xl font-bold tabular-nums text-slate-950">{money(agent.totalBalanceUsd, locale)}</p><p className={`mt-2 text-sm font-bold tabular-nums ${pnlTone(agent.totalPnlUsd)}`}>{percent(agent.totalReturnPercent, locale)} · {money(agent.totalPnlUsd, locale)} P/L</p><dl className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tr ? "Yatırılmış" : "Invested"}</dt><dd className="mt-1 font-bold tabular-nums text-slate-900">{money(agent.positionsValueUsd, locale)}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tr ? "Kullanılabilir nakit" : "Deployable cash"}</dt><dd className="mt-1 font-bold tabular-nums text-slate-900">{money(agent.deployableCashUsd, locale)}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tr ? "Gerçekleşen" : "Realized"}</dt><dd className={`mt-1 font-bold tabular-nums ${pnlTone(agent.realizedPnlUsd)}`}>{money(agent.realizedPnlUsd, locale)}</dd></div><div className="rounded-xl bg-slate-50 p-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{tr ? "Gerçekleşmemiş" : "Unrealized"}</dt><dd className={`mt-1 font-bold tabular-nums ${pnlTone(agent.unrealizedPnlUsd)}`}>{money(agent.unrealizedPnlUsd, locale)}</dd></div></dl><div className="mt-5 grid grid-cols-2 gap-2">{agent.periods.map((period) => <div key={period.key} className="rounded-xl border border-slate-200 p-3"><p className="text-[10px] font-semibold uppercase text-slate-500">{tr ? period.labelTr : period.labelEn}{period.isPartial ? "*" : ""}</p><p className={`mt-1 font-bold tabular-nums ${pnlTone(period.returnPercent)}`}>{percent(period.returnPercent, locale)}</p><p className="text-xs tabular-nums text-slate-500">{money(period.pnlUsd, locale)}</p></div>)}</div><div className="mt-4 flex items-center justify-between text-xs text-slate-500"><span>{agent.tradeCount} {tr ? "işlem" : "trades"}</span><span>{tr ? "Maks. düşüş" : "Max drawdown"} <strong className="tabular-nums text-rose-600">-{agent.maximumDrawdownPercent.toFixed(2)}%</strong></span></div><Link href={`/${locale}/vip/ajanlar/${agent.slug}`} className="mt-5 inline-flex w-full justify-center rounded-xl bg-[#e7c977] px-4 py-3 text-sm font-semibold text-[#07111f] transition hover:bg-[#f3dda0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2">{tr ? "Portföyü ve tüm işlemleri aç" : "Open portfolio and all trades"}</Link></div></article>; })}</div>
    <p className="text-xs leading-5 text-slate-500">* {tr ? "Ajan dönemden daha yeniyse sonuç kuruluş tarihinden bugüne ölçülür. Gösterilen işlemler sanaldır." : "If an agent is newer than a period, the result is measured since inception. All displayed trades are virtual."}</p>
  </div>;
}

export function VipAgentDetailView({ agent, locale }: { agent: AgentDetail; locale: Locale }) {
  const tr = locale === "tr";
  const skin = identity(agent.slug);
  const date = (value: Date) => new Intl.DateTimeFormat(tr ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(value);
  return <div className="space-y-7" data-testid={`vip-agent-${agent.slug}`}>
    <header className="overflow-hidden rounded-[2rem] border border-[#e7c977]/30 bg-[radial-gradient(circle_at_85%_10%,rgba(231,201,119,0.14),transparent_32%),linear-gradient(145deg,#07111f,#101d32)] p-7 text-white shadow-[0_30px_90px_rgba(2,8,23,0.24)] md:p-10"><Link href={`/${locale}/vip/ajanlar`} className="inline-flex rounded-lg text-sm font-semibold text-[#f3dda0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c977]">← {tr ? "Tüm ajanlar" : "All agents"}</Link><div className="mt-6 flex flex-wrap items-end justify-between gap-6"><div className="max-w-3xl"><div className="flex flex-wrap items-center gap-3"><div className={`flex h-14 w-14 items-center justify-center rounded-2xl border ${skin.soft}`}><AgentGlyph slug={agent.slug} className="h-8 w-8"/></div><div><p className={`text-xs font-semibold uppercase tracking-[0.18em] ${skin.accent}`}>{tr ? skin.eyebrowTr : skin.eyebrowEn}</p><h1 className="mt-1 text-5xl font-bold tracking-tight">{agent.name}</h1><p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{tr ? skin.profileTr : skin.profileEn}</p></div></div><p className="mt-5 text-sm leading-7 text-slate-300">{localizedDescription(agent, locale)}</p><div className="mt-5 flex flex-wrap gap-2"><VirtualBadge locale={locale}/><FreshnessBadge value={agent.latestSnapshotAt ?? agent.lastRunAt} locale={locale}/></div></div><div className="min-w-60 rounded-2xl border border-white/10 bg-white/6 p-5"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{tr ? "Toplam hesap" : "Total account"}</p><p className="mt-1 text-3xl font-bold tabular-nums">{money(agent.totalBalanceUsd, locale)}</p><p className={`mt-2 font-bold tabular-nums ${agent.totalPnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{percent(agent.totalReturnPercent, locale)} · {money(agent.totalPnlUsd, locale)}</p></div></div></header>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Metric label={tr ? "Kullanılabilir nakit" : "Deployable cash"} value={money(agent.deployableCashUsd, locale)} detail={tr ? `Koruma rezervi: ${money(agent.reserveUsd, locale)}` : `Protected reserve: ${money(agent.reserveUsd, locale)}`}/><Metric label={tr ? "Açık pozisyon değeri" : "Open position value"} value={money(agent.positionsValueUsd, locale)} detail={`${agent.positions.length} ${tr ? "açık pozisyon" : "open positions"}`}/><Metric label={tr ? "Gerçekleşen P/L" : "Realized P/L"} value={money(agent.realizedPnlUsd, locale)} tone={pnlTone(agent.realizedPnlUsd)} detail={`${agent._count.trades} ${tr ? "kayıtlı işlem" : "recorded trades"}`}/><Metric label={tr ? "Gerçekleşmemiş P/L" : "Unrealized P/L"} value={money(agent.unrealizedPnlUsd, locale)} tone={pnlTone(agent.unrealizedPnlUsd)} detail={`${tr ? "Maksimum düşüş" : "Max drawdown"}: -${agent.maximumDrawdownPercent.toFixed(2)}%`}/></section>

    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.15em] text-amber-700">{tr ? "Özsermaye rotası" : "Equity path"}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{tr ? "1.000.000 USD aktif sermaye" : "USD 1,000,000 active capital"}</h2></div><p className="text-xs text-slate-500">{agent.equityHistory.length} snapshot</p></div><div className="mt-5"><SingleEquityChart agent={agent} locale={locale}/></div><div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{agent.periods.map((period) => <article key={period.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-[10px] font-semibold uppercase text-slate-500">{tr ? period.labelTr : period.labelEn}{period.isPartial ? "*" : ""}</p><p className={`mt-2 text-xl font-bold tabular-nums ${pnlTone(period.returnPercent)}`}>{percent(period.returnPercent, locale)}</p><p className="mt-1 text-xs tabular-nums text-slate-500">{money(period.pnlUsd, locale)}</p></article>)}</div></section>

    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">{tr ? "Canlı sanal portföy" : "Live virtual portfolio"}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{tr ? "Açık pozisyonlar" : "Open positions"}</h2></div><span className="text-xs font-medium text-slate-500">{tr ? "Güncel fiyat / maliyet / stop / hedef" : "Current / cost / stop / target"}</span></div>
      <div className="mt-5 space-y-4 md:hidden">{agent.positions.length ? agent.positions.map((position) => <article key={position.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950">{position.symbol}</h3><p className="text-xs text-slate-500">{position.displayName}</p></div><div className="text-right"><p className={`font-bold tabular-nums ${pnlTone(position.unrealizedPnlUsd)}`}>{money(position.unrealizedPnlUsd, locale)}</p><p className={`text-xs font-semibold tabular-nums ${pnlTone(position.unrealizedPnlPercent)}`}>{percent(position.unrealizedPnlPercent, locale)}</p></div></div><dl className="mt-4 grid grid-cols-2 gap-3 text-xs"><div><dt className="text-slate-500">{tr ? "Adet" : "Quantity"}</dt><dd className="font-semibold tabular-nums text-slate-900">{compactNumber(position.quantity, locale)}</dd></div><div><dt className="text-slate-500">{tr ? "Piyasa değeri" : "Market value"}</dt><dd className="font-semibold tabular-nums text-slate-900">{money(position.marketValueUsd, locale)}</dd></div></dl><RiskRewardStrip stop={position.stopLossUsd} entry={position.averagePriceUsd} current={position.lastPriceUsd} target={position.targetPriceUsd} currency="USD" locale={locale}/></article>) : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{tr ? "Ajan şu anda nakitte bekliyor." : "The agent is currently waiting in cash."}</p>}</div>
      <div className="mt-5 hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="sticky left-0 z-20 bg-slate-100 px-4 py-3">{tr ? "Varlık" : "Asset"}</th><th className="px-4 py-3">{tr ? "Adet" : "Quantity"}</th><th className="px-4 py-3">{tr ? "Piyasa değeri" : "Market value"}</th><th className="px-4 py-3">P/L</th><th className="min-w-80 px-4 py-3">{tr ? "Risk / getiri" : "Risk / reward"}</th></tr></thead><tbody>{agent.positions.length ? agent.positions.map((position) => <tr key={position.id} className="border-t border-slate-100 align-top"><td className="sticky left-0 bg-white px-4 py-4 font-bold text-slate-950">{position.symbol}<span className="block max-w-40 truncate text-xs font-normal text-slate-500">{position.displayName}</span></td><td className="px-4 py-4 tabular-nums">{compactNumber(position.quantity, locale)}</td><td className="px-4 py-4 font-semibold tabular-nums">{money(position.marketValueUsd, locale)}</td><td className={`px-4 py-4 font-bold tabular-nums ${pnlTone(position.unrealizedPnlUsd)}`}>{money(position.unrealizedPnlUsd, locale)}<span className="block text-xs">{percent(position.unrealizedPnlPercent, locale)}</span></td><td className="px-4 py-3"><RiskRewardStrip stop={position.stopLossUsd} entry={position.averagePriceUsd} current={position.lastPriceUsd} target={position.targetPriceUsd} currency="USD" locale={locale}/></td></tr>) : <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-500">{tr ? "Ajan şu anda nakitte bekliyor." : "The agent is currently waiting in cash."}</td></tr>}</tbody></table></div>
    </section>

    <section id="islem-gunlugu" className="scroll-mt-24 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm md:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">{tr ? "Denetlenebilir kayıt" : "Auditable record"}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{tr ? "Eksiksiz alım-satım günlüğü" : "Complete trade log"}</h2><p className="mt-2 max-w-4xl text-sm leading-6 text-slate-500">{tr ? "Her alım kendi pozisyon döngüsüne bağlıdır: açık döngüler güncel gerçekleşmemiş, kapanmış döngüler gerçekleşen sonucu gösterir." : "Each buy is tied to its own position cycle: open cycles show current unrealized P/L and closed cycles show realized P/L."}</p>
      <div className="mt-5 space-y-3 md:hidden">{agent.trades.length ? agent.trades.map((trade) => <article key={trade.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold ${trade.side === "BUY" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{trade.side === "BUY" ? (tr ? "AL" : "BUY") : (tr ? "SAT" : "SELL")}</span><h3 className="mt-2 text-lg font-bold text-slate-950">{trade.symbol}</h3><time dateTime={trade.executedAt.toISOString()} className="text-xs text-slate-500">{date(trade.executedAt)}</time></div><div className="text-right"><p className="font-semibold tabular-nums text-slate-950">{money(trade.grossUsd, locale)}</p><p className={`mt-1 text-sm font-bold tabular-nums ${typeof trade.pnlUsd === "number" ? pnlTone(trade.pnlUsd) : "text-slate-400"}`}>{typeof trade.pnlUsd === "number" ? money(trade.pnlUsd, locale) : tr ? "Veri yok" : "Unavailable"}</p><p className="text-[10px] font-semibold uppercase text-slate-400">{trade.pnlState === "OPEN" ? (tr ? "Gerçekleşmemiş" : "Unrealized") : trade.pnlState === "CLOSED" ? (tr ? "Gerçekleşen" : "Realized") : (tr ? "Eşleşmedi" : "Unmatched")}</p></div></div><p className="mt-3 text-xs text-slate-500">{compactNumber(trade.quantity, locale)} @ {money(trade.priceUsd, locale, 2)}</p><p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-5 text-slate-600">{trade.reason}</p></article>) : <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{tr ? "Henüz işlem yok." : "No trades yet."}</p>}</div>
      <div className="mt-5 hidden overflow-x-auto md:block"><table className="min-w-full text-left text-sm"><thead className="sticky top-0 z-10 bg-slate-100 text-[11px] uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">{tr ? "Tarih" : "Date"}</th><th className="px-4 py-3">{tr ? "İşlem" : "Side"}</th><th className="sticky left-0 z-20 bg-slate-100 px-4 py-3">{tr ? "Varlık" : "Asset"}</th><th className="px-4 py-3">{tr ? "Adet / fiyat" : "Quantity / price"}</th><th className="px-4 py-3">{tr ? "Tutar" : "Gross"}</th><th className="px-4 py-3">{tr ? "İşlem P/L" : "Trade P/L"}</th><th className="px-4 py-3">{tr ? "Gerekçe" : "Rationale"}</th></tr></thead><tbody>{agent.trades.length ? agent.trades.map((trade) => <tr key={trade.id} className="border-t border-slate-100 align-top"><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500"><time dateTime={trade.executedAt.toISOString()}>{date(trade.executedAt)}</time></td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${trade.side === "BUY" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{trade.side === "BUY" ? (tr ? "AL" : "BUY") : (tr ? "SAT" : "SELL")}</span></td><td className="sticky left-0 bg-white px-4 py-4 font-bold text-slate-950">{trade.symbol}</td><td className="whitespace-nowrap px-4 py-4 tabular-nums">{compactNumber(trade.quantity, locale)}<span className="block text-xs text-slate-500">@ {money(trade.priceUsd, locale, 2)}</span></td><td className="px-4 py-4 tabular-nums">{money(trade.grossUsd, locale)}</td><td className={`px-4 py-4 font-bold tabular-nums ${typeof trade.pnlUsd === "number" ? pnlTone(trade.pnlUsd) : "text-slate-400"}`}>{typeof trade.pnlUsd === "number" ? money(trade.pnlUsd, locale) : tr ? "Veri yok" : "Unavailable"}<span className="block text-xs">{typeof trade.pnlPercent === "number" ? percent(trade.pnlPercent, locale) : "-"}</span><span className="mt-1 block text-[10px] font-semibold uppercase text-slate-400">{trade.pnlState === "OPEN" ? (tr ? "Gerçekleşmemiş" : "Unrealized") : trade.pnlState === "CLOSED" ? (tr ? "Gerçekleşen" : "Realized") : (tr ? "Eşleşmedi" : "Unmatched")}</span></td><td className="min-w-72 px-4 py-4 text-xs leading-5 text-slate-600">{trade.reason}</td></tr>) : <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{tr ? "Henüz işlem yok." : "No trades yet."}</td></tr>}</tbody></table></div><HistoryPagination pagination={agent.tradePagination} kind="trades" locale={locale} slug={agent.slug} tradePage={agent.tradePagination.page} decisionPage={agent.decisionPagination.page}/>
    </section>

    <section id="karar-izi" className="scroll-mt-24 rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5 md:p-7"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">{tr ? "Ajan muhakemesi" : "Agent reasoning"}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{tr ? "Günlük karar zaman çizgisi" : "Daily decision timeline"}</h2><div className="relative mt-6 space-y-5 before:absolute before:bottom-4 before:left-[11px] before:top-4 before:w-px before:bg-slate-300">{agent.decisions.length ? agent.decisions.map((decision) => { const meta = decisionMeta(decision.action, locale); return <article key={decision.id} className="relative pl-10"><span className={`absolute left-0 top-5 z-10 h-6 w-6 rounded-full border-4 border-slate-50 ${meta.dot}`}/><div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${meta.tone}`}>{meta.label}</span><p className="font-bold text-slate-950">{decision.symbol}</p></div><time dateTime={decision.createdAt.toISOString()} className="text-xs text-slate-500">{date(decision.createdAt)}</time></div><p className="mt-3 text-sm leading-6 text-slate-600">{decision.reason}</p></div></article>; }) : <p className="pl-10 text-sm text-slate-500">{tr ? "Henüz karar kaydı yok." : "No decisions have been recorded yet."}</p>}</div><HistoryPagination pagination={agent.decisionPagination} kind="decisions" locale={locale} slug={agent.slug} tradePage={agent.tradePagination.page} decisionPage={agent.decisionPagination.page}/></section>

    <p className="rounded-2xl border border-[#d8c486]/60 bg-[#fff9e8] p-5 text-xs leading-6 text-slate-700"><strong className="text-slate-950">{tr ? "Sanal portföy açıklaması:" : "Virtual portfolio disclosure:"}</strong> {tr ? "Bu portföy gerçek para emri göndermez. Fiyatlar son erişilebilir piyasa kapanışından alınan sanal gerçekleşmelerdir; hisse bölünmeleri pozisyonlara uygulanır, temettü nakit akışları getiriye dahil edilmez. Komisyon, vergi ve kayma da dahil değildir." : "This portfolio never sends real-money orders. Executions are simulated at the latest available market close; stock splits are applied to positions, while dividend cash flows are excluded from returns. Fees, taxes, and slippage are also excluded."}</p>
  </div>;
}
