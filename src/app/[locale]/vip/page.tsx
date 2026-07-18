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

export default async function VipPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; message?: string; payment?: string; archivePage?: string | string[] }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const requestedArchivePage = getArchivePage(query.archivePage);
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

  const archiveCount = await prisma.vipResearchReport.count();
  const archiveTotalPages = Math.max(1, Math.ceil(archiveCount / VIP_ARCHIVE_PAGE_SIZE));
  const archivePage = Math.min(requestedArchivePage, archiveTotalPages);
  const [latest, archive, agents] = await Promise.all([
    prisma.vipResearchReport.findFirst({
      orderBy: { generatedAt: "desc" },
      include: { ideas: { orderBy: { rank: "asc" }, include: { evaluations: { orderBy: { dueAt: "asc" } } } } },
    }),
    prisma.vipResearchReport.findMany({
      orderBy: { generatedAt: "desc" },
      select: { id: true, generatedAt: true, fallbackUsed: true, _count: { select: { ideas: true } } },
      skip: (archivePage - 1) * VIP_ARCHIVE_PAGE_SIZE,
      take: VIP_ARCHIVE_PAGE_SIZE,
    }),
    getVipAgentSummaries(),
  ]);

  if (!latest) {
    return <div className="space-y-6"><section className="rounded-3xl border border-amber-200 bg-amber-50 p-6"><h1 className="text-3xl font-black text-slate-950">SABİT · OLGUN · YILDIRIM</h1><p className="mt-3 text-sm text-slate-700">{locale === "en" ? "VIP virtual agents are ready even while the first research report is being prepared." : "İlk araştırma raporu hazırlanırken VIP sanal ajan masasına erişebilirsin."}</p><Link href={`/${locale}/vip/ajanlar`} className="mt-5 inline-flex rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-amber-300">{locale === "en" ? "Open VIP agents" : "VIP ajanlarını aç"}</Link></section><section className="rounded-3xl border border-amber-200 bg-white p-8"><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-700">Enbilir VIP</p><h2 className="mt-3 text-3xl font-black">{locale === "en" ? "The first 07:00 report is being prepared" : "İlk 07.00 raporu hazırlanıyor"}</h2><p className="mt-4 text-slate-600">{locale === "en" ? "The report will appear here automatically after the scheduled research run." : "Zamanlanmış araştırma çalıştıktan sonra rapor burada otomatik görünecek."}</p></section></div>;
  }

  return (
    <div className="space-y-9">
      <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.18em] text-amber-800">VIP {locale === "en" ? "Agent desk" : "Ajan masası"}</p><h2 className="mt-2 text-2xl font-black text-slate-950">SABİT · OLGUN · YILDIRIM</h2><p className="mt-2 text-sm text-slate-700">{locale === "en" ? "Open live virtual portfolios, period P/L, positions, trades and the complete decision trail." : "Canlı sanal portföyleri, dönemsel kâr/zararı, pozisyonları, işlemleri ve eksiksiz karar izini aç."}</p></div><Link href={`/${locale}/vip/ajanlar`} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-amber-300">{locale === "en" ? "Open VIP agents" : "VIP ajanlarını aç"}</Link></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-3">{agents.map((agent) => <Link key={agent.id} href={`/${locale}/vip/ajanlar/${agent.slug}`} className="rounded-2xl border border-amber-200 bg-white p-4 hover:border-amber-500"><p className="font-black text-slate-950">{agent.name}</p><p className={`mt-1 text-lg font-black ${agent.totalPnlUsd >= 0 ? "text-emerald-700" : "text-rose-700"}`}>{agent.totalReturnPercent >= 0 ? "+" : ""}{agent.totalReturnPercent.toFixed(2)}% · ${agent.totalPnlUsd.toLocaleString("en-US", { maximumFractionDigits: 0 })}</p></Link>)}</div>
      </section>
      <VipResearchReportView report={latest} locale={locale} />
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-950">{locale === "en" ? "VIP report archive" : "VIP rapor arşivi"}</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{archive.map((report) => <Link key={report.id} href={`/${locale}/vip/raporlar/${report.id}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4 hover:border-amber-400"><p className="font-black text-slate-950">{new Intl.DateTimeFormat(locale === "en" ? "en-US" : "tr-TR", { dateStyle: "long", timeZone: "Europe/Istanbul" }).format(report.generatedAt)}</p><p className="mt-1 text-xs font-bold text-slate-500">{report._count.ideas} {locale === "en" ? "ideas" : "fikir"}{report.fallbackUsed ? " · Nicel izleme modu" : " · Kaynaklı araştırma"}</p></Link>)}</div>
        {archiveTotalPages > 1 ? <nav className="mt-5 flex items-center justify-between gap-3 border-t border-slate-200 pt-4" aria-label={locale === "en" ? "VIP report archive pages" : "VIP rapor arşivi sayfaları"}>
          <p className="text-xs font-bold text-slate-500">{locale === "en" ? "Page" : "Sayfa"} {archivePage}/{archiveTotalPages} · {archiveCount} {locale === "en" ? "reports" : "rapor"}</p>
          <div className="flex gap-2">
            {archivePage > 1 ? <Link prefetch={false} href={`/${locale}/vip?archivePage=${archivePage - 1}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700">← {locale === "en" ? "Previous" : "Önceki"}</Link> : null}
            {archivePage < archiveTotalPages ? <Link prefetch={false} href={`/${locale}/vip?archivePage=${archivePage + 1}`} className="rounded-lg border border-slate-300 px-3 py-2 text-xs font-black text-slate-700">{locale === "en" ? "Next" : "Sonraki"} →</Link> : null}
          </div>
        </nav> : null}
      </section>
    </div>
  );
}
