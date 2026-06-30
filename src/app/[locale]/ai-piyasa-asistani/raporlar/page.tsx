import Link from "next/link";
import type { Metadata } from "next";
import { MacroReportTicker } from "@/components/ai-market/MacroReportTicker";
import { getSessionUser } from "@/lib/auth";
import { sendLatestMacroReportEmailAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { getSafeLocale } from "@/i18n/config";
import { buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/ai-piyasa-asistani/raporlar", page: "reports" });
}

export default async function AiMarketReportsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = await searchParams;
  const locale = getSafeLocale(rawLocale);
  const isEnglish = locale === "en";
  const user = await getSessionUser();
  const publicReportScopes = ["GLOBAL", "WEEKLY"];
  const reports = await prisma.aiMarketReport.findMany({
    where: user ? { OR: [{ userId: user.id }, { scope: { in: publicReportScopes } }] } : { scope: { in: publicReportScopes } },
    orderBy: { generatedAt: "desc" },
    take: 24,
    select: {
      id: true,
      generatedAt: true,
      macroSummary: true,
      marketRegime: true,
      riskAppetite: true,
      scope: true,
      fallbackUsed: true,
      assets: { select: { id: true } },
    },
  });
  const latestReport = reports[0] ?? null;
  const totalAssets = reports.reduce((sum, report) => sum + report.assets.length, 0);
  const averageAssets = reports.length > 0 ? Math.round(totalAssets / reports.length) : 0;
  const weeklyReports = reports.filter((report) => report.scope === "WEEKLY").length;

  return (
    <main className="macro-report-page min-h-screen px-3 py-5 text-white md:px-5">
      <div className="mx-auto max-w-6xl">
        <MacroReportTicker variant="dark" locale={locale} />
        <section className="macro-report-hero mt-5 rounded-[1.75rem] border border-white/10 p-5 shadow-2xl md:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">{isEnglish ? "AI agent reports" : "AI ajan raporları"}</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">{isEnglish ? "Daily and weekly macro reports" : "Günlük ve haftalık makro raporlar"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base md:leading-8">
                {isEnglish
                  ? "The AI agent reads macro conditions, news flow, technical context, and favorite assets at 07:00, 12:00, and 18:00 Turkey time. On Mondays it also publishes a broader weekly report that reviews the previous week and frames the week ahead."
                  : "AI ajanı Türkiye saatiyle 07.00, 12.00 ve 18.00'de makro konjonktürü, haber akışını, teknik bağlamı ve favori varlıkları birlikte okur. Pazartesi günleri ayrıca önceki haftayı ve içinde bulunulan haftayı daha geniş perspektifle anlatan haftalık rapor yayınlar."}
              </p>
              <div className="mt-5 flex flex-col gap-2 sm:flex-row">
                <form action={sendLatestMacroReportEmailAction}>
                  <input type="hidden" name="locale" value={locale} />
                  <button className="ai-report-primary-action w-full rounded-md border border-emerald-300/30 bg-emerald-300/15 px-4 py-3 text-sm font-black text-emerald-50 transition hover:bg-emerald-300/25 sm:w-fit">
                    {isEnglish ? "Email me the latest report" : "En son raporu mail at"}
                  </button>
                </form>
                <Link href={`/${locale}/ai-piyasa-asistani`} className="w-full rounded-md border border-white/15 bg-white/8 px-4 py-3 text-center text-sm font-black text-white sm:w-fit">
                  {isEnglish ? "Back to terminal" : "Terminale dön"}
                </Link>
              </div>
            </div>
            <div className="macro-report-hero-panel rounded-[1.25rem] border border-white/10 bg-white/8 p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-[#d1bfa7]">{isEnglish ? "Current archive" : "Mevcut arşiv"}</p>
              <div className="mt-4 grid gap-3">
                <ReportMetric label={isEnglish ? "Reports" : "Rapor"} value={String(reports.length)} />
                <ReportMetric label={isEnglish ? "Weekly" : "Haftalık"} value={String(weeklyReports)} />
                <ReportMetric label={isEnglish ? "Avg. assets" : "Ort. varlık"} value={String(averageAssets)} />
                <ReportMetric label={isEnglish ? "Schedule" : "Takvim"} value="07 / 12 / 18 + Mon" />
              </div>
            </div>
          </div>
        </section>

        {query?.error ? (
          <div className="mt-4 rounded-md border border-red-300/30 bg-red-300/10 p-3 text-sm font-bold text-red-100">{query.error}</div>
        ) : null}
        {query?.message ? (
          <div className="mt-4 rounded-md border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-bold text-emerald-100">{query.message}</div>
        ) : null}

        {latestReport ? (
          <Link href={`/${locale}/ai-piyasa-asistani/raporlar/${latestReport.id}`} className="macro-latest-report mt-5 block rounded-[1.4rem] border border-[#d1bfa7]/30 p-5 shadow-2xl">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">{isEnglish ? "Latest report" : "Son rapor"}</p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  {isEnglish ? "Latest macro context is ready" : latestReport.marketRegime ?? "Piyasa rejimi"}
                </h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">
                  {isEnglish
                    ? "This report includes market regime, risk appetite, watched assets, and macro/news context generated by the scheduled AI agent."
                    : latestReport.macroSummary}
                </p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <span className="rounded-md border border-white/12 bg-white/8 px-3 py-2 text-xs font-black text-slate-200">
                  {new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(latestReport.generatedAt)}
                </span>
                <span className="rounded-md border border-[#d1bfa7]/40 bg-[#d1bfa7]/10 px-3 py-2 text-xs font-black text-[#f3dec0]">
                  {getReportScopeLabel(latestReport.scope, isEnglish)}
                </span>
                <span className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100">
                  {isEnglish ? "Risk context" : latestReport.riskAppetite ?? "Risk modu"}
                </span>
              </div>
            </div>
          </Link>
        ) : null}

        <div className="mt-6 grid gap-3">
          {reports.length === 0 ? (
            <div className="macro-empty-state rounded-[1.25rem] border border-slate-800 bg-[#0b111d] p-5 text-sm text-slate-300">
              {isEnglish
                ? "No reports yet. The first report will appear here after the live cron creates the 07:00, 12:00, or 18:00 report."
                : "Henüz rapor yok. Canlı cron 07.00, 12.00 veya 18.00 raporunu ürettiğinde ilk rapor burada görünecek."}
            </div>
          ) : (
            reports.map((report) => (
              <Link
                key={report.id}
                href={`/${locale}/ai-piyasa-asistani/raporlar/${report.id}`}
                className="macro-report-list-card rounded-[1.15rem] border border-slate-800 bg-[#0b111d] p-4 shadow-xl transition hover:border-cyan-300/40"
              >
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">
                      {new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(report.generatedAt)}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-white">
                      {isEnglish ? "Scheduled macro report" : report.marketRegime ?? "Piyasa rejimi"}
                    </h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">
                      {isEnglish
                        ? "Open the report to review the AI agent's market context, technical scan, watched assets, and risk notes."
                        : report.macroSummary}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-black text-slate-300">
                      {isEnglish ? `${report.assets.length} assets` : `${report.assets.length} varlık`}
                    </span>
                    <span className="rounded-md border border-[#d1bfa7]/35 bg-[#d1bfa7]/10 px-2 py-1 text-xs font-black text-[#f3dec0]">
                      {getReportScopeLabel(report.scope, isEnglish)}
                    </span>
                    <span className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-xs font-black text-emerald-100">
                      {isEnglish ? "Risk context" : report.riskAppetite ?? "Risk modu"}
                    </span>
                    {report.fallbackUsed ? (
                      <span className="rounded-md border border-amber-300/30 bg-amber-300/10 px-2 py-1 text-xs font-black text-amber-100">
                        fallback
                      </span>
                    ) : null}
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}

function getReportScopeLabel(scope: string, isEnglish: boolean) {
  if (scope === "WEEKLY") {
    return isEnglish ? "Weekly report" : "Haftalık rapor";
  }

  if (scope === "USER") {
    return isEnglish ? "Personal report" : "Kişisel rapor";
  }

  return isEnglish ? "Daily macro" : "Günlük makro";
}

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-300">{label}</p>
    </div>
  );
}
