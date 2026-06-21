import Link from "next/link";
import { MacroReportTicker } from "@/components/ai-market/MacroReportTicker";
import { getSessionUser } from "@/lib/auth";
import { sendLatestMacroReportEmailAction } from "@/lib/actions";
import { prisma } from "@/lib/prisma";
import { getSafeLocale } from "@/i18n/config";

export const dynamic = "force-dynamic";

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
  const reports = await prisma.aiMarketReport.findMany({
    where: user ? { OR: [{ userId: user.id }, { scope: "GLOBAL" }] } : { scope: "GLOBAL" },
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

  return (
    <main className="macro-report-page min-h-screen px-3 py-5 text-white md:px-5">
      <div className="mx-auto max-w-6xl">
        <MacroReportTicker variant="dark" locale={locale} />
        <section className="macro-report-hero mt-5 rounded-[1.75rem] border border-white/10 p-5 shadow-2xl md:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">{isEnglish ? "AI agent reports" : "AI ajan raporları"}</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">{isEnglish ? "Daily macro reports" : "Günlük makro raporlar"}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300 md:text-base md:leading-8">
                {isEnglish
                  ? "The AI agent reads macro conditions, news flow, technical context, and favorite assets at 07:00, 12:00, and 18:00 Türkiye time. The goal is not to create noise, but to leave a clear market note for the day."
                  : "AI ajanı Türkiye saatiyle 07.00, 12.00 ve 18.00'de makro konjonktürü, haber akışını, teknik bağlamı ve favori varlıkları birlikte okur. Amaç gürültü üretmek değil, güne net bir piyasa notu bırakmaktır."}
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
                <ReportMetric label={isEnglish ? "Avg. assets" : "Ort. varlık"} value={String(averageAssets)} />
                <ReportMetric label={isEnglish ? "Daily slots" : "Günlük saat"} value="07 / 12 / 18" />
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
                <h2 className="mt-2 text-2xl font-black text-white">{latestReport.marketRegime ?? (isEnglish ? "Market regime" : "Piyasa rejimi")}</h2>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-300">{latestReport.macroSummary}</p>
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                <span className="rounded-md border border-white/12 bg-white/8 px-3 py-2 text-xs font-black text-slate-200">
                  {new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(latestReport.generatedAt)}
                </span>
                <span className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-3 py-2 text-xs font-black text-emerald-100">
                  {latestReport.riskAppetite ?? (isEnglish ? "Risk mode" : "Risk modu")}
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
                      {new Intl.DateTimeFormat(isEnglish ? "en-US" : "tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(report.generatedAt)} · {report.scope}
                    </p>
                    <h2 className="mt-1 text-lg font-black text-white">{report.marketRegime ?? (isEnglish ? "Market regime" : "Piyasa rejimi")}</h2>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-300">{report.macroSummary}</p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    <span className="rounded-md border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-black text-slate-300">
                      {isEnglish ? `${report.assets.length} assets` : `${report.assets.length} varlik`}
                    </span>
                    <span className="rounded-md border border-emerald-300/30 bg-emerald-300/10 px-2 py-1 text-xs font-black text-emerald-100">
                      {report.riskAppetite ?? (isEnglish ? "Risk mode" : "Risk modu")}
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

function ReportMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/10 p-3">
      <p className="text-2xl font-black text-white">{value}</p>
      <p className="mt-1 text-xs font-black uppercase tracking-[0.14em] text-slate-300">{label}</p>
    </div>
  );
}
