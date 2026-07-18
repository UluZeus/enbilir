import Link from "next/link";
import type { getVipAgentDetail, getVipAgentSummaries } from "@/lib/vip-agents/dashboard";

type AgentSummary = Awaited<ReturnType<typeof getVipAgentSummaries>>[number];
type AgentDetail = NonNullable<Awaited<ReturnType<typeof getVipAgentDetail>>>;
type AgentHistoryPagination = AgentDetail["tradePagination"];

function money(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits }).format(value);
}

function percent(value: number) {
  return `${value >= 0 ? "+" : ""}${value.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
}

function pnlTone(value: number) {
  return value > 0 ? "text-emerald-700" : value < 0 ? "text-rose-700" : "text-slate-600";
}

function profileTone(profile: string) {
  if (profile === "MUHAFAZAKAR") return "border-sky-200 bg-sky-50 text-sky-900";
  if (profile === "AGRESIF") return "border-rose-200 bg-rose-50 text-rose-900";
  return "border-amber-200 bg-amber-50 text-amber-900";
}

function historyPageHref({
  locale,
  slug,
  tradePage,
  decisionPage,
  anchor,
}: {
  locale: "tr" | "en";
  slug: string;
  tradePage: number;
  decisionPage: number;
  anchor: string;
}) {
  const query = new URLSearchParams();
  if (tradePage > 1) query.set("tradePage", String(tradePage));
  if (decisionPage > 1) query.set("decisionPage", String(decisionPage));
  const serialized = query.toString();
  return `/${locale}/vip/ajanlar/${slug}${serialized ? `?${serialized}` : ""}#${anchor}`;
}

function HistoryPagination({
  pagination,
  kind,
  locale,
  slug,
  tradePage,
  decisionPage,
}: {
  pagination: AgentHistoryPagination;
  kind: "trades" | "decisions";
  locale: "tr" | "en";
  slug: string;
  tradePage: number;
  decisionPage: number;
}) {
  if (pagination.totalItems === 0) return null;
  const tr = locale === "tr";
  const anchor = kind === "trades" ? "islem-gunlugu" : "karar-izi";
  const itemLabel = kind === "trades" ? (tr ? "işlem" : "trades") : (tr ? "karar" : "decisions");
  const href = (page: number) => historyPageHref({
    locale,
    slug,
    tradePage: kind === "trades" ? page : tradePage,
    decisionPage: kind === "decisions" ? page : decisionPage,
    anchor,
  });

  return (
    <nav className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4" aria-label={tr ? `${itemLabel} sayfaları` : `${itemLabel} pages`}>
      <p className="text-xs font-bold text-slate-500">
        {pagination.firstItem.toLocaleString(tr ? "tr-TR" : "en-US")}–{pagination.lastItem.toLocaleString(tr ? "tr-TR" : "en-US")} / {pagination.totalItems.toLocaleString(tr ? "tr-TR" : "en-US")} {itemLabel}
        <span className="ml-2 text-slate-400">· {tr ? "Sayfa" : "Page"} {pagination.page}/{pagination.totalPages}</span>
      </p>
      {pagination.totalPages > 1 ? (
        <div className="flex items-center gap-2">
          {pagination.hasPreviousPage ? (
            <Link prefetch={false} href={href(pagination.page - 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-amber-400 hover:text-slate-950">
              ← {tr ? "Önceki" : "Previous"}
            </Link>
          ) : <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-black text-slate-400">← {tr ? "Önceki" : "Previous"}</span>}
          {pagination.hasNextPage ? (
            <Link prefetch={false} href={href(pagination.page + 1)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black text-slate-700 hover:border-amber-400 hover:text-slate-950">
              {tr ? "Sonraki" : "Next"} →
            </Link>
          ) : <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-black text-slate-400">{tr ? "Sonraki" : "Next"} →</span>}
        </div>
      ) : null}
    </nav>
  );
}

export function VipAgentPublicSummary({ agents, locale }: { agents: AgentSummary[]; locale: "tr" | "en" }) {
  const tr = locale === "tr";
  if (agents.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-lg border border-amber-200 bg-white shadow-sm" data-testid="public-vip-agents">
      <div className="border-b border-amber-200 bg-[#111827] px-6 py-5 text-white md:flex md:items-center md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-amber-300">Enbilir VIP · {tr ? "Canlı sanal portföyler" : "Live virtual portfolios"}</p>
          <h2 className="mt-2 text-2xl font-black">{tr ? "VIP ajanlarının ölçülen performansı" : "Measured VIP agent performance"}</h2>
        </div>
        <Link href={`/${locale}/vip`} className="mt-3 inline-flex rounded-md border border-amber-300 px-4 py-2 text-sm font-black text-amber-300 md:mt-0">{tr ? "VIP detaylarını gör" : "See VIP details"}</Link>
      </div>
      <div className="grid gap-0 md:grid-cols-3">
        {agents.map((agent) => {
          const weekly = agent.periods.find((period) => period.key === "weekly")!;
          const monthly = agent.periods.find((period) => period.key === "monthly")!;
          const weeklySentence = weekly.pnlUsd > 0
            ? (tr ? `Bu hafta ${money(weekly.pnlUsd)} kazandı` : `${money(weekly.pnlUsd)} gained this week`)
            : weekly.pnlUsd < 0
              ? (tr ? `Bu hafta ${money(Math.abs(weekly.pnlUsd))} kaybetti` : `${money(Math.abs(weekly.pnlUsd))} lost this week`)
              : (tr ? "Bu hafta henüz değişim yok" : "No change yet this week");
          return (
            <article key={agent.id} className="border-b border-slate-200 p-5 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
              <div className="flex items-center justify-between gap-3"><h3 className="text-2xl font-black text-slate-950">{agent.name}</h3><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${profileTone(agent.riskProfile)}`}>{agent.riskProfile}</span></div>
              <p className={`mt-5 text-3xl font-black ${pnlTone(weekly.returnPercent)}`}>{percent(weekly.returnPercent)}</p>
              <p className="mt-1 text-sm font-bold text-slate-600">{weeklySentence}</p>
              <div className="mt-4 flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-xs"><span className="font-bold text-slate-500">{tr ? "Bu ay" : "This month"}</span><span className={`font-black ${pnlTone(monthly.returnPercent)}`}>{percent(monthly.returnPercent)} · {money(monthly.pnlUsd)}</span></div>
              <p className="mt-3 text-[11px] leading-5 text-slate-500">{tr ? "Yüzdeler 1.000.000 USD performans tabanı üzerinden hesaplanır." : "Returns use a fixed USD 1,000,000 performance base."}</p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function VipAgentOverview({ agents, locale }: { agents: AgentSummary[]; locale: "tr" | "en" }) {
  const tr = locale === "tr";
  return (
    <div className="space-y-6" data-testid="vip-agent-overview">
      <header className="rounded-3xl border border-amber-300/40 bg-[#111827] p-7 text-white shadow-xl md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">Enbilir VIP · {tr ? "Otonom sanal portföy masası" : "Autonomous virtual portfolio desk"}</p>
        <h1 className="mt-3 text-4xl font-black md:text-5xl">SABİT · OLGUN · YILDIRIM</h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-300">{tr ? "Her ajan 1.100.000 USD toplam bakiye ile başlar. 100.000 USD güvenlik rezervidir; pozisyonlar ve bütün getiri yüzdeleri 1.000.000 USD aktif sermaye üzerinden hesaplanır." : "Each agent starts with USD 1,100,000. USD 100,000 is ring-fenced; sizing and all return percentages use the USD 1,000,000 active-capital base."}</p>
      </header>
      <div className="grid gap-5 xl:grid-cols-3">
        {agents.map((agent) => (
          <article key={agent.id} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-slate-500">{agent.riskProfile}</p><h2 className="mt-1 text-3xl font-black text-slate-950">{agent.name}</h2></div><span className={`rounded-full border px-3 py-1 text-xs font-black ${profileTone(agent.riskProfile)}`}>{agent.openPositionCount} {tr ? "açık" : "open"}</span></div>
            <p className="mt-4 min-h-16 text-sm leading-6 text-slate-600">{agent.description}</p>
            <div className="mt-5 rounded-2xl bg-slate-950 p-5 text-white"><p className="text-xs font-black uppercase text-slate-400">{tr ? "Toplam hesap" : "Total account"}</p><p className="mt-1 text-3xl font-black">{money(agent.totalBalanceUsd)}</p><p className={`mt-2 text-sm font-black ${agent.totalPnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{percent(agent.totalReturnPercent)} · {money(agent.totalPnlUsd)} P/L</p></div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              {agent.periods.map((period) => <div key={period.key} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-black uppercase text-slate-500">{tr ? period.labelTr : period.labelEn}{period.isPartial ? "*" : ""}</p><p className={`mt-1 font-black ${pnlTone(period.returnPercent)}`}>{percent(period.returnPercent)}</p><p className="text-xs text-slate-500">{money(period.pnlUsd)}</p></div>)}
            </div>
            <Link href={`/${locale}/vip/ajanlar/${agent.slug}`} className="mt-5 inline-flex w-full justify-center rounded-xl bg-amber-400 px-4 py-3 text-sm font-black text-slate-950 hover:bg-amber-300">{tr ? "Portföyü ve tüm işlemleri aç" : "Open portfolio and all trades"}</Link>
          </article>
        ))}
      </div>
      <p className="text-xs leading-5 text-slate-500">* {tr ? "Ajan belirtilen dönemden daha yeniyse sonuç kuruluş tarihinden bugüne hesaplanır." : "If the agent is newer than the period, the result is measured since inception."}</p>
    </div>
  );
}

export function VipAgentDetailView({ agent, locale }: { agent: AgentDetail; locale: "tr" | "en" }) {
  const tr = locale === "tr";
  const date = (value: Date) => new Intl.DateTimeFormat(tr ? "tr-TR" : "en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(value);
  return (
    <div className="space-y-7" data-testid={`vip-agent-${agent.slug}`}>
      <header className="rounded-3xl border border-amber-300/40 bg-[#111827] p-7 text-white shadow-xl md:p-10">
        <Link href={`/${locale}/vip/ajanlar`} className="text-sm font-black text-amber-300">← {tr ? "Tüm ajanlar" : "All agents"}</Link>
        <div className="mt-5 flex flex-wrap items-end justify-between gap-5"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">{agent.riskProfile}</p><h1 className="mt-2 text-5xl font-black">{agent.name}</h1><p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">{agent.description}</p></div><div><p className="text-xs font-black uppercase text-slate-400">{tr ? "Toplam hesap" : "Total account"}</p><p className="text-3xl font-black">{money(agent.totalBalanceUsd)}</p><p className={agent.totalPnlUsd >= 0 ? "font-black text-emerald-300" : "font-black text-rose-300"}>{percent(agent.totalReturnPercent)} · {money(agent.totalPnlUsd)}</p></div></div>
      </header>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">{agent.periods.map((period) => <article key={period.key} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-[10px] font-black uppercase text-slate-500">{tr ? period.labelTr : period.labelEn}{period.isPartial ? "*" : ""}</p><p className={`mt-2 text-2xl font-black ${pnlTone(period.returnPercent)}`}>{percent(period.returnPercent)}</p><p className="mt-1 text-xs text-slate-500">{money(period.pnlUsd)}</p></article>)}</section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-black text-slate-950">{tr ? "Açık pozisyonlar" : "Open positions"}</h2><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Varlık</th><th className="px-4 py-3">Adet</th><th className="px-4 py-3">Maliyet</th><th className="px-4 py-3">Son fiyat</th><th className="px-4 py-3">P/L</th><th className="px-4 py-3">Stop</th><th className="px-4 py-3">Hedef</th></tr></thead><tbody>{agent.positions.length ? agent.positions.map((position) => <tr key={position.id} className="border-t border-slate-100"><td className="px-4 py-4 font-black">{position.symbol}<span className="block text-xs font-normal text-slate-500">{position.displayName}</span></td><td className="px-4 py-4">{position.quantity.toLocaleString("tr-TR", { maximumFractionDigits: 4 })}</td><td className="px-4 py-4">{money(position.averagePriceUsd, 2)}</td><td className="px-4 py-4">{money(position.lastPriceUsd, 2)}</td><td className={`px-4 py-4 font-black ${pnlTone(position.unrealizedPnlUsd)}`}>{money(position.unrealizedPnlUsd)}<span className="block text-xs">{percent(position.unrealizedPnlPercent)}</span></td><td className="px-4 py-4 text-rose-700">{money(position.stopLossUsd, 2)}</td><td className="px-4 py-4 text-emerald-700">{money(position.targetPriceUsd, 2)}</td></tr>) : <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{tr ? "Ajan şu anda nakitte bekliyor." : "The agent is currently waiting in cash."}</td></tr>}</tbody></table></div></section>

      <section id="islem-gunlugu" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-2xl font-black text-slate-950">{tr ? "Eksiksiz alım-satım günlüğü" : "Complete trade log"}</h2><p className="mt-2 text-sm text-slate-500">{tr ? "Her alım yalnızca kendi pozisyon döngüsüne bağlıdır: açık döngüler güncel gerçekleşmemiş, kapanmış döngüler gerçekleşen sonucu gösterir." : "Each buy is tied only to its own position cycle: open cycles show current unrealized P/L and closed cycles show realized P/L."}</p><div className="mt-5 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-slate-100 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Tarih</th><th className="px-4 py-3">İşlem</th><th className="px-4 py-3">Varlık</th><th className="px-4 py-3">Adet / fiyat</th><th className="px-4 py-3">Tutar</th><th className="px-4 py-3">İşlem P/L</th><th className="px-4 py-3">Gerekçe</th></tr></thead><tbody>{agent.trades.length ? agent.trades.map((trade) => <tr key={trade.id} className="border-t border-slate-100 align-top"><td className="whitespace-nowrap px-4 py-4 text-xs text-slate-500">{date(trade.executedAt)}</td><td className="px-4 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${trade.side === "BUY" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>{trade.side}</span></td><td className="px-4 py-4 font-black">{trade.symbol}</td><td className="whitespace-nowrap px-4 py-4">{trade.quantity.toLocaleString("tr-TR", { maximumFractionDigits: 4 })}<span className="block text-xs text-slate-500">@ {money(trade.priceUsd, 2)}</span></td><td className="px-4 py-4">{money(trade.grossUsd)}</td><td className={`px-4 py-4 font-black ${typeof trade.pnlUsd === "number" ? pnlTone(trade.pnlUsd) : "text-slate-400"}`}>{typeof trade.pnlUsd === "number" ? money(trade.pnlUsd) : tr ? "Veri yok" : "Unavailable"}<span className="block text-xs">{typeof trade.pnlPercent === "number" ? percent(trade.pnlPercent) : "-"}</span><span className="mt-1 block text-[10px] font-bold uppercase text-slate-400">{trade.pnlState === "OPEN" ? (tr ? "Gerçekleşmemiş" : "Unrealized") : trade.pnlState === "CLOSED" ? (tr ? "Gerçekleşen" : "Realized") : (tr ? "Eşleşmedi" : "Unmatched")}</span></td><td className="min-w-72 px-4 py-4 text-xs leading-5 text-slate-600">{trade.reason}</td></tr>) : <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-500">{tr ? "Henüz işlem yok." : "No trades yet."}</td></tr>}</tbody></table></div><HistoryPagination pagination={agent.tradePagination} kind="trades" locale={locale} slug={agent.slug} tradePage={agent.tradePagination.page} decisionPage={agent.decisionPagination.page} /></section>

      <section id="karar-izi" className="scroll-mt-24 rounded-3xl border border-slate-200 bg-slate-50 p-6"><h2 className="text-xl font-black text-slate-950">{tr ? "Günlük karar izi" : "Daily decision trail"}</h2><div className="mt-4 space-y-3">{agent.decisions.map((decision) => <article key={decision.id} className="rounded-xl border border-slate-200 bg-white p-4"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-black text-slate-950">{decision.symbol} · {decision.action}</p><p className="text-xs text-slate-500">{date(decision.createdAt)}</p></div><p className="mt-2 text-sm leading-6 text-slate-600">{decision.reason}</p></article>)}</div><HistoryPagination pagination={agent.decisionPagination} kind="decisions" locale={locale} slug={agent.slug} tradePage={agent.tradePagination.page} decisionPage={agent.decisionPagination.page} /></section>

      <p className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-xs leading-6 text-amber-950">{tr ? "Bu portföy gerçek para emri göndermez. Fiyatlar son erişilebilir piyasa kapanışından alınan sanal gerçekleşmelerdir; hisse bölünmeleri pozisyonlara uygulanır, temettü nakit akışları getiriye dahil edilmez. Komisyon, vergi ve kayma da dahil değildir." : "This portfolio never sends real-money orders. Executions are simulated at the latest available market close; stock splits are applied to positions, while dividend cash flows are excluded from returns. Fees, taxes, and slippage are also excluded."}</p>
    </div>
  );
}
