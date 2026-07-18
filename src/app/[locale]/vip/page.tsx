import Link from "next/link";
import type { Metadata } from "next";
import { VipPaywall } from "@/components/vip/VipPaywall";
import { VipResearchReportView } from "@/components/vip/VipResearchReportView";
import { FormMessage } from "@/components/FormMessage";
import { getSafeLocale } from "@/i18n/config";
import { canAccessAdmin, getSessionUser } from "@/lib/auth";
import { getMembershipSnapshot } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";
import { getVipAgentSummaries } from "@/lib/vip-agents/dashboard";

export const dynamic = "force-dynamic";
const VIP_ARCHIVE_PAGE_SIZE = 20;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/vip", page: "vip" });
}

function getArchivePage(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = raw && /^\d+$/.test(raw) ? Number(raw) : 1;
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

function getArchiveFilter(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw === "research" || raw === "watch" ? raw : "all";
}

export default async function VipPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; message?: string; payment?: string; archivePage?: string | string[]; archiveFilter?: string | string[] }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const requestedArchivePage = getArchivePage(query.archivePage);
  const archiveFilter = getArchiveFilter(query.archiveFilter);
  const session = await getSessionUser();
  const membershipUser = session ? await prisma.user.findUnique({ where: { id: session.id }, select: { createdAt: true, membershipTier: true, vipPaidUntil: true } }) : null;
  const membership = membershipUser ? getMembershipSnapshot(membershipUser) : null;
  const canView = Boolean(session && (membership?.isVipActive || canAccessAdmin(session.role)));

  if (!canView) {
    const latestClaim = session ? await prisma.vipSubscriptionClaim.findFirst({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      select: { status: true, providerReference: true, createdAt: true },
    }) : null;
    return <div className="grid gap-5"><FormMessage message={query.error ?? query.message} tone={query.message ? "success" : "error"} /><VipPaywall locale={locale} isSignedIn={Boolean(session)} latestClaim={latestClaim} /></div>;
  }

  const archiveWhere = archiveFilter === "research"
    ? { fallbackUsed: false }
    : archiveFilter === "watch"
      ? { fallbackUsed: true }
      : {};
  const [archiveCount, archiveGroups] = await Promise.all([
    prisma.vipResearchReport.count({ where: archiveWhere }),
    prisma.vipResearchReport.groupBy({ by: ["fallbackUsed"], _count: { _all: true } }),
  ]);
  const archiveTotalCount = archiveGroups.reduce((total, group) => total + group._count._all, 0);
  const researchCount = archiveGroups.find((group) => !group.fallbackUsed)?._count._all ?? 0;
  const watchCount = archiveGroups.find((group) => group.fallbackUsed)?._count._all ?? 0;
  const archiveTotalPages = Math.max(1, Math.ceil(archiveCount / VIP_ARCHIVE_PAGE_SIZE));
  const archivePage = Math.min(requestedArchivePage, archiveTotalPages);
  const [latest, archive, agents] = await Promise.all([
    prisma.vipResearchReport.findFirst({
      orderBy: { generatedAt: "desc" },
      include: { ideas: { orderBy: { rank: "asc" }, include: { evaluations: { orderBy: { dueAt: "asc" } } } } },
    }),
    prisma.vipResearchReport.findMany({
      where: archiveWhere,
      orderBy: { generatedAt: "desc" },
      select: { id: true, generatedAt: true, fallbackUsed: true, _count: { select: { ideas: true } } },
      skip: (archivePage - 1) * VIP_ARCHIVE_PAGE_SIZE,
      take: VIP_ARCHIVE_PAGE_SIZE,
    }),
    getVipAgentSummaries(),
  ]);

  if (!latest) {
    return <div className="space-y-6"><section className="rounded-[2rem] border border-[#e7c977]/30 bg-[radial-gradient(circle_at_85%_8%,rgba(231,201,119,0.16),transparent_30%),linear-gradient(145deg,#07111f,#101d32)] p-7 text-white shadow-xl md:p-10"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e7c977]">Enbilir VIP · {locale === "en" ? "Virtual agent desk" : "Sanal ajan masası"}</p><h1 className="mt-3 text-4xl font-bold tracking-tight">SABİT · OLGUN · YILDIRIM</h1><p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">{locale === "en" ? "VIP virtual agents are ready while the first research report is being prepared." : "İlk araştırma raporu hazırlanırken VIP sanal ajan masasına erişebilirsin."}</p><Link href={`/${locale}/vip/ajanlar`} className="mt-6 inline-flex rounded-xl bg-[#e7c977] px-5 py-3 text-sm font-semibold text-[#07111f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c977] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07111f]">{locale === "en" ? "Open VIP agents" : "VIP ajanlarını aç"}</Link></section><section className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">Enbilir VIP</p><h2 className="mt-3 text-3xl font-bold text-slate-950">{locale === "en" ? "The first 07:00 report is being prepared" : "İlk 07.00 raporu hazırlanıyor"}</h2><p className="mt-4 text-slate-600">{locale === "en" ? "The report will appear here automatically after the scheduled research run." : "Zamanlanmış araştırma çalıştıktan sonra rapor burada otomatik görünecek."}</p></section></div>;
  }

  return (
    <div className="space-y-9">
      <section className="rounded-[1.75rem] border border-[#e7c977]/30 bg-[#0b1526] p-6 text-white shadow-xl">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#e7c977]">VIP {locale === "en" ? "Agent desk" : "Ajan masası"}</p><h2 className="mt-2 text-2xl font-bold">SABİT · OLGUN · YILDIRIM</h2><p className="mt-2 text-sm leading-6 text-slate-300">{locale === "en" ? "Open live virtual portfolios, period P/L, positions, trades and the complete decision trail." : "Canlı sanal portföyleri, dönemsel kâr/zararı, pozisyonları, işlemleri ve eksiksiz karar izini aç."}</p></div><Link href={`/${locale}/vip/ajanlar`} className="rounded-xl bg-[#e7c977] px-5 py-3 text-sm font-semibold text-[#07111f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c977] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1526]">{locale === "en" ? "Open VIP agents" : "VIP ajanlarını aç"}</Link></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{agents.map((agent) => <Link key={agent.id} href={`/${locale}/vip/ajanlar/${agent.slug}`} className="rounded-2xl border border-white/10 bg-white/7 p-4 transition hover:border-[#e7c977]/60 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c977]"><div className="flex items-center justify-between gap-2"><p className="font-bold">{agent.name}</p><span className="rounded-full border border-white/15 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-300">{locale === "en" ? "Virtual" : "Sanal"}</span></div><p className={`mt-2 text-lg font-bold tabular-nums ${agent.totalPnlUsd >= 0 ? "text-emerald-300" : "text-rose-300"}`}>{agent.totalReturnPercent >= 0 ? "+" : ""}{agent.totalReturnPercent.toLocaleString(locale === "en" ? "en-US" : "tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}% · {new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(agent.totalPnlUsd)}</p><p className="mt-1 text-[10px] text-slate-400">{agent.latestSnapshotAt ? new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(agent.latestSnapshotAt) : locale === "en" ? "No snapshot yet" : "Henüz snapshot yok"}</p></Link>)}</div>
      </section>
      <VipResearchReportView report={latest} locale={locale} />
      <section id="report-archive" className="scroll-mt-28 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-700">{locale === "en" ? "Research history" : "Araştırma geçmişi"}</p><h2 className="mt-1 text-2xl font-bold text-slate-950">{locale === "en" ? "VIP report archive" : "VIP rapor arşivi"}</h2></div><div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-slate-100 px-3 py-1.5 font-semibold text-slate-600">{archiveTotalCount} {locale === "en" ? "total" : "toplam"}</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 font-semibold text-emerald-700">{researchCount} {locale === "en" ? "sourced" : "kaynaklı"}</span><span className="rounded-full bg-amber-50 px-3 py-1.5 font-semibold text-amber-800">{watchCount} {locale === "en" ? "watch-only" : "izleme"}</span></div></div>
        <nav className="mt-5 flex flex-wrap gap-2" aria-label={locale === "en" ? "Archive filters" : "Arşiv filtreleri"}>{(["all", "research", "watch"] as const).map((filter) => { const selected = archiveFilter === filter; const label = filter === "all" ? (locale === "en" ? "All reports" : "Tüm raporlar") : filter === "research" ? (locale === "en" ? "Sourced research" : "Kaynaklı araştırma") : (locale === "en" ? "Watch-only" : "Nicel izleme"); return <Link key={filter} prefetch={false} href={`/${locale}/vip?archiveFilter=${filter}#report-archive`} aria-current={selected ? "page" : undefined} className={`rounded-xl border px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${selected ? "border-[#0b1526] bg-[#0b1526] text-[#f3dda0]" : "border-slate-200 bg-white text-slate-600 hover:border-amber-400"}`}>{label}</Link>; })}</nav>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{archive.length ? archive.map((report) => <Link key={report.id} href={`/${locale}/vip/raporlar/${report.id}`} className="group rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 transition hover:border-[#d8c486] hover:bg-[#fff9e8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"><div className="flex items-start justify-between gap-3"><p className="font-semibold text-slate-950">{new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(report.generatedAt)}</p><span aria-hidden="true" className="text-slate-400 group-hover:text-amber-700">→</span></div><p className="mt-2 text-xs font-medium text-slate-500">{report._count.ideas} {locale === "en" ? "ideas" : "fikir"} · {report.fallbackUsed ? (locale === "en" ? "Quantitative watch-only" : "Nicel izleme modu") : (locale === "en" ? "Sourced research" : "Kaynaklı araştırma")}</p></Link>) : <p className="col-span-full rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">{locale === "en" ? "No reports match this filter." : "Bu filtreyle eşleşen rapor yok."}</p>}</div>
        {archiveTotalPages > 1 ? <nav className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4" aria-label={locale === "en" ? "VIP report archive pages" : "VIP rapor arşivi sayfaları"}>
          <p className="text-xs font-bold text-slate-500">{locale === "en" ? "Page" : "Sayfa"} {archivePage}/{archiveTotalPages} · {archiveCount} {locale === "en" ? "reports" : "rapor"}</p>
          <div className="flex gap-2">
            {archivePage > 1 ? <Link prefetch={false} href={`/${locale}/vip?archiveFilter=${archiveFilter}&archivePage=${archivePage - 1}#report-archive`} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">← {locale === "en" ? "Previous" : "Önceki"}</Link> : null}
            {archivePage < archiveTotalPages ? <Link prefetch={false} href={`/${locale}/vip?archiveFilter=${archiveFilter}&archivePage=${archivePage + 1}#report-archive`} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500">{locale === "en" ? "Next" : "Sonraki"} →</Link> : null}
          </div>
        </nav> : null}
      </section>
    </div>
  );
}
