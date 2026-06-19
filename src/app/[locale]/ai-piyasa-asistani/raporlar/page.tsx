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

  return (
    <main className="min-h-screen bg-[#030711] px-3 py-5 text-white md:px-5">
      <div className="mx-auto max-w-6xl">
        <MacroReportTicker variant="dark" locale={locale} />
        <div className="mt-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#f5a623]">{isEnglish ? "AI agent reports" : "AI ajan raporlari"}</p>
            <h1 className="mt-2 text-3xl font-black">{isEnglish ? "Daily macro reports" : "Günlük makro raporlar"}</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
              {isEnglish
                ? "AI agent reports generated at 07:00, 12:00, and 18:00 Türkiye time for macro context, news flow, and favorite assets."
                : "Makro konjonktur, haber akisi ve favori varliklar icin Turkiye saatiyle 07:00, 12:00 ve 18:00 saatlerinde uretilen AI ajan raporlari."}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <form action={sendLatestMacroReportEmailAction}>
              <input type="hidden" name="locale" value={locale} />
              <button className="w-full rounded-md border border-emerald-300/30 bg-emerald-300/15 px-3 py-2 text-sm font-black text-emerald-50 transition hover:bg-emerald-300/25 sm:w-fit">
                {isEnglish ? "Email me the latest report" : "En son raporu mail at"}
              </button>
            </form>
            <Link href={`/${locale}/ai-piyasa-asistani`} className="w-full rounded-md border border-cyan-300/30 bg-cyan-300/10 px-3 py-2 text-center text-sm font-black text-cyan-100 sm:w-fit">
              {isEnglish ? "Back to terminal" : "Terminale don"}
            </Link>
          </div>
        </div>

        {query?.error ? (
          <div className="mt-4 rounded-md border border-red-300/30 bg-red-300/10 p-3 text-sm font-bold text-red-100">{query.error}</div>
        ) : null}
        {query?.message ? (
          <div className="mt-4 rounded-md border border-emerald-300/30 bg-emerald-300/10 p-3 text-sm font-bold text-emerald-100">{query.message}</div>
        ) : null}

        <div className="mt-6 grid gap-3">
          {reports.length === 0 ? (
            <div className="rounded-md border border-slate-800 bg-[#0b111d] p-5 text-sm text-slate-300">
              {isEnglish
                ? "No reports yet. The first report will appear here after the live cron creates the 07:00, 12:00, or 18:00 report."
                : "Henuz rapor yok. Canli cron 07:00, 12:00 veya 18:00 raporunu urettiginde ilk rapor burada gorunecek."}
            </div>
          ) : (
            reports.map((report) => (
              <Link
                key={report.id}
                href={`/${locale}/ai-piyasa-asistani/raporlar/${report.id}`}
                className="rounded-md border border-slate-800 bg-[#0b111d] p-4 shadow-xl transition hover:border-cyan-300/40"
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
