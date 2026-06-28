import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import type { Metadata } from "next";
import { PrintReportButton } from "@/components/ai-market/PrintReportButton";
import { getSessionUser } from "@/lib/auth";
import { getSafeLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { macroReportEventTypes } from "@/lib/ai-market/report-event-types";
import { recordMacroReportEvent } from "@/lib/ai-market/report-events";
import { buildPageMetadata } from "@/lib/seo";
import type { TechnicalSeries, TechnicalSeriesPoint } from "@/lib/ai-market/indicators";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string; id: string }> }): Promise<Metadata> {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({
    locale,
    path: `/ai-piyasa-asistani/raporlar/${id}`,
    page: "reports",
    keywords: ["makro rapor arşivi", "AI rapor detayı", "piyasa raporu PDF"],
  });
}

const REPORT_PREFACE = {
  tr: "Burada yazan tüm yazı ve düşünceler yatırım tavsiyesi niteliğinde olmayıp sadece Dr. Hakan Ünsal'ın kişisel görüşlerini yansıtmaktadır. Ayrıca yapay zeka çıktısı da yine Dr. Hakan Ünsal'ın eğittiği bir yapay zeka ajanı olduğu dikkate alınmalıdır. Yapay zeka hata yapabilir, buradaki bazı değerler gecikmeli olabilir ve bir başka kaynaktan da doğrulamakta her zaman fayda vardır.",
  en: "The comments and views here are not investment advice. They reflect the educational market-reading framework prepared by Dr. Hakan Unsal and the AI agent trained for Enbilir. AI can make mistakes, market data may be delayed or incomplete, and independent verification is always useful.",
};
const THREE_DAYS_MS = 1000 * 60 * 60 * 24 * 3;

type SourcePayload = {
  interval?: string;
  technicalSeries?: TechnicalSeries;
};

type ReportAssetSummary = {
  displayName: string;
  assetClass: string;
  category: string | null;
  changePercent: number | null;
  riskScore: number | null;
  signalType: string | null;
};

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function formatNumber(value: number | null, locale = "tr") {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return value.toLocaleString(locale === "en" ? "en-US" : "tr-TR", { maximumFractionDigits: value >= 100 ? 2 : 4 });
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) {
    return "-";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatSignal(value: string | null, locale = "tr") {
  const labels: Record<string, Record<string, string>> = {
    tr: {
      STRONG_BUY: "GÜÇLÜ AL",
      BUY: "AL",
      WATCH: "İZLE",
      HOLD: "BEKLE",
      TAKE_PROFIT: "KAR REALİZASYONU İZLE",
      SELL: "SAT",
      AVOID: "UZAK DUR",
      NO_TRADE: "İŞLEM YOK",
    },
    en: {
      STRONG_BUY: "STRONG BUY",
      BUY: "BUY",
      WATCH: "WATCH",
      HOLD: "HOLD",
      TAKE_PROFIT: "WATCH TAKE-PROFIT",
      SELL: "SELL",
      AVOID: "AVOID",
      NO_TRADE: "NO TRADE",
    },
  };

  return value ? labels[locale === "en" ? "en" : "tr"][value] ?? value : "-";
}

function getReportDashboardStats(assets: ReportAssetSummary[]) {
  const riskValues = assets
    .map((asset) => asset.riskScore)
    .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  const averageRisk = riskValues.length > 0 ? Math.round(riskValues.reduce((sum, value) => sum + value, 0) / riskValues.length) : 0;
  const signalCounts = assets.reduce<Record<string, number>>((acc, asset) => {
    const signal = asset.signalType ?? "NO_SIGNAL";
    acc[signal] = (acc[signal] ?? 0) + 1;
    return acc;
  }, {});
  const heatmap = Object.values(
    assets.reduce<Record<string, { label: string; count: number; averageChange: number; risk: number }>>((acc, asset) => {
      const label = asset.category ?? asset.assetClass ?? "Other";
      const existing = acc[label] ?? { label, count: 0, averageChange: 0, risk: 0 };
      const change = typeof asset.changePercent === "number" && Number.isFinite(asset.changePercent) ? asset.changePercent : 0;
      const risk = typeof asset.riskScore === "number" && Number.isFinite(asset.riskScore) ? asset.riskScore : 0;

      acc[label] = {
        label,
        count: existing.count + 1,
        averageChange: existing.averageChange + change,
        risk: existing.risk + risk,
      };
      return acc;
    }, {}),
  ).map((item) => ({
    ...item,
    averageChange: item.count > 0 ? item.averageChange / item.count : 0,
    risk: item.count > 0 ? item.risk / item.count : 0,
  }));
  const topRiskAssets = [...assets]
    .filter((asset) => typeof asset.riskScore === "number")
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 3);

  return { averageRisk, signalCounts, heatmap, topRiskAssets };
}

function readSourcePayload(value: unknown): SourcePayload {
  if (!value || typeof value !== "object") {
    return {};
  }

  return value as SourcePayload;
}

function compactPoints(points: TechnicalSeriesPoint[]) {
  const latest = points.at(-1);

  if (!latest) {
    return [];
  }

  const windowStart = latest.time - THREE_DAYS_MS;
  const filtered = points.filter((point) => point.time >= windowStart);

  return filtered.length > 0 ? filtered : points.slice(-72);
}

function numericValues(points: TechnicalSeriesPoint[], keys: Array<keyof TechnicalSeriesPoint>) {
  return points.flatMap((point) =>
    keys
      .map((key) => point[key])
      .filter((value): value is number => typeof value === "number" && Number.isFinite(value)),
  );
}

function valueRange(values: number[], fallbackMin = 0, fallbackMax = 1) {
  if (values.length === 0) {
    return { min: fallbackMin, max: fallbackMax };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);

  if (min === max) {
    const padding = Math.abs(min || 1) * 0.05;
    return { min: min - padding, max: max + padding };
  }

  return { min, max };
}

function scale(value: number, min: number, max: number, height: number, padding = 10) {
  if (max === min) {
    return height / 2;
  }

  return height - padding - ((value - min) / (max - min)) * (height - padding * 2);
}

function formatAxisNumber(value: number) {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("tr-TR", { maximumFractionDigits: 0 });
  }

  if (Math.abs(value) >= 10) {
    return value.toLocaleString("tr-TR", { maximumFractionDigits: 1 });
  }

  return value.toLocaleString("tr-TR", { maximumFractionDigits: 3 });
}

function getIstanbulHour(timestamp: number) {
  const parts = new Intl.DateTimeFormat("tr-TR", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).formatToParts(new Date(timestamp));

  return Number(parts.find((part) => part.type === "hour")?.value ?? "0");
}

function formatTickDate(timestamp: number) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Istanbul",
  }).format(new Date(timestamp)).replace("/", ".");
}

function getXAxisTicks(points: TechnicalSeriesPoint[], width: number) {
  if (points.length === 0) {
    return [];
  }

  const ticks = points
    .map((point, index) => ({ point, index }))
    .filter(({ point }) => getIstanbulHour(point.time) % 4 === 0)
    .map(({ point, index }) => ({
      x: points.length <= 1 ? 0 : (index / (points.length - 1)) * width,
      label: formatTickDate(point.time),
    }));

  if (ticks.length <= 6) {
    return ticks;
  }

  const step = Math.ceil(ticks.length / 6);
  return ticks.filter((_, index) => index % step === 0).slice(0, 6);
}

function getYAxisTicks(min: number, max: number, height: number) {
  return [max, (max + min) / 2, min].map((value) => ({
    y: scale(value, min, max, height),
    label: formatAxisNumber(value),
  }));
}

function linePath(points: TechnicalSeriesPoint[], key: keyof TechnicalSeriesPoint, width: number, height: number, min: number, max: number) {
  const values = points
    .map((point, index) => {
      const value = point[key];

      if (typeof value !== "number" || !Number.isFinite(value)) {
        return null;
      }

      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
      const y = scale(value, min, max, height);

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .filter((value): value is string => value !== null);

  return values.length > 0 ? `M ${values.join(" L ")}` : "";
}

function areaPath(points: TechnicalSeriesPoint[], upperKey: keyof TechnicalSeriesPoint, lowerKey: keyof TechnicalSeriesPoint, width: number, height: number, min: number, max: number) {
  const upper = points
    .map((point, index) => {
      const value = point[upperKey];
      if (typeof value !== "number") return null;
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
      return `${x.toFixed(2)},${scale(value, min, max, height).toFixed(2)}`;
    })
    .filter((value): value is string => value !== null);
  const lower = points
    .map((point, index) => {
      const value = point[lowerKey];
      if (typeof value !== "number") return null;
      const x = points.length <= 1 ? 0 : (index / (points.length - 1)) * width;
      return `${x.toFixed(2)},${scale(value, min, max, height).toFixed(2)}`;
    })
    .filter((value): value is string => value !== null)
    .reverse();

  return upper.length > 1 && lower.length > 1 ? `M ${upper.join(" L ")} L ${lower.join(" L ")} Z` : "";
}

export default async function AiMarketReportDetailPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale: rawLocale, id } = await params;
  const locale = getSafeLocale(rawLocale);
  const user = await getSessionUser();
  const recipientName = user?.name?.trim() || user?.nickname?.trim() || "Enbilir kullanicisi";
  const report = await prisma.aiMarketReport.findFirst({
    where: {
      id,
      OR: user ? [{ userId: user.id }, { scope: { in: ["GLOBAL", "WEEKLY"] } }] : [{ scope: { in: ["GLOBAL", "WEEKLY"] } }],
    },
    include: {
      assets: { orderBy: [{ category: "asc" }, { symbol: "asc" }] },
      newsItems: { orderBy: { relevance: "desc" }, take: 20 },
    },
  });

  if (!report) {
    notFound();
  }

  await recordMacroReportEvent({
    reportId: report.id,
    userId: user?.id,
    eventType: macroReportEventTypes.read,
    metadata: { locale, source: "report-detail" },
  });

  const takeaways = toStringArray(report.keyTakeaways);
  const requiredCoverage = toStringArray(report.requiredCoverage);
  const chartAssets = report.assets.filter((asset) => readSourcePayload(asset.sourcePayload).technicalSeries?.points.length).slice(0, 6);
  const isEnglish = locale === "en";
  const dashboardStats = getReportDashboardStats(report.assets);
  const isWeeklyReport = report.scope === "WEEKLY";

  if (isEnglish) {
    return (
      <main className="report-shell report-screen-shell min-h-screen px-3 py-5 text-[#152033] md:px-5">
        <article className="mx-auto grid max-w-[1120px] gap-5">
          <section className="report-screen-hero rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <Image src="/logo.svg" alt="Enbilir logo" width={52} height={52} className="rounded-md" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">Enbilir AI Macro Report</p>
                    <p className="text-sm font-bold text-slate-500">Prepared by the scheduled AI agent trained for Enbilir.</p>
                  </div>
                </div>
                <h1 className="mt-2 text-3xl font-black text-[#111827] md:text-5xl">{isWeeklyReport ? "Scheduled Weekly Macro Report" : "Scheduled Macro Report"}</h1>
                <p className="mt-2 text-sm font-bold text-slate-500">
                  {new Intl.DateTimeFormat("en-US", { dateStyle: "full", timeStyle: "short" }).format(report.generatedAt)} · {report.scope}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link href={`/${locale}/ai-piyasa-asistani/raporlar`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700">
                  Report list
                </Link>
                <PrintReportButton reportId={report.id} locale={locale} />
              </div>
            </div>

            <div className="mt-5 rounded-[1.15rem] border border-[#d1bfa7]/40 bg-[#fffaf6]/82 p-4 text-sm leading-7 text-[#49494b]">
              {REPORT_PREFACE.en}
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="report-screen-card rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">English summary</p>
                <p className="mt-3 text-sm leading-7 text-slate-700">
                  This English report view summarizes the scheduled AI report without showing Turkish raw commentary from older stored reports. Use it to review the date, market coverage, watched assets, signal labels, and news-source context. The Turkish version keeps the full generated text for the original report.
                </p>
              </div>
              <aside className="report-screen-card rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Report frame</p>
                <div className="mt-3 grid gap-2">
                  <Info label="Assets covered" value={`${report.assets.length} assets`} />
                  <Info label="Model" value={report.model ?? (report.fallbackUsed ? "Rule-based fallback" : "-")} />
                  <Info label="Period" value={isWeeklyReport ? "Weekly" : "1 hour"} />
                </div>
              </aside>
            </div>

            {takeaways.length > 0 ? (
              <div className="mt-5 rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Takeaway count</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  The original report contains {takeaways.length} AI-generated takeaway{takeaways.length === 1 ? "" : "s"}. For a fully translated historical archive, regenerate future reports in English or store translated report fields separately.
                </p>
              </div>
            ) : null}

            <ReportVisualDashboard locale="en" stats={dashboardStats} riskAppetite={report.riskAppetite} marketRegime={report.marketRegime} />

            {requiredCoverage.length > 0 ? (
              <div className="mt-5 rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Coverage</p>
                <p className="mt-2 text-sm leading-7 text-slate-700">
                  This report covers the macro basket, watched assets, technical context, and available public-news context used by the scheduled agent.
                </p>
              </div>
            ) : null}
          </section>

          <section className="report-assets-section rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-xl">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Asset scan</p>
              <h2 className="mt-1 text-2xl font-black">Favorites and macro basket</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {report.assets.map((asset) => (
                <div key={asset.id} className="report-asset-card rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{asset.category ?? asset.assetClass}</p>
                      <h3 className="mt-1 text-lg font-black">{asset.displayName}</h3>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{formatNumber(asset.lastPrice, "en")}</Badge>
                      <Badge>{formatPercent(asset.changePercent)}</Badge>
                      <Badge>{formatSignal(asset.signalType, "en")}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {chartAssets.length > 0 ? (
            <section className="report-chart-section rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">Chart coverage</p>
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {chartAssets.length} asset{chartAssets.length === 1 ? "" : "s"} include recent technical chart data in this report.
              </p>
            </section>
          ) : null}

          <section className="report-news-section rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">News sources used</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from(new Set(report.newsItems.map((item) => item.source))).map((source) => (
                <span key={source} className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">
                  {source}
                </span>
              ))}
              {report.newsItems.length === 0 ? <p className="text-sm text-slate-600">No news-source item was attached to this report.</p> : null}
            </div>
            <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
              {REPORT_PREFACE.en}
            </p>
          </section>
        </article>
      </main>
    );
  }

  return (
    <main className="report-shell report-screen-shell min-h-screen px-3 py-5 text-[#152033] md:px-5">
      <style>{`
        @page { size: A4; margin: 14mm 13mm; }
        .print-only { display: none; }
        @media print {
          html, body { background: #fff !important; color: #111827 !important; }
          .visual-shell > header,
          .visual-shell > footer,
          .visual-shell > .fixed { display: none !important; }
          .visual-shell > main { max-width: none !important; padding: 0 !important; }
          .report-shell { background: #fff !important; padding: 0 !important; font-family: Georgia, "Times New Roman", serif !important; }
          .screen-only { display: none !important; }
          .print-only { display: block !important; }
          .print-logo { display: block !important; width: 32mm !important; height: auto !important; margin: 0 auto 8mm !important; }
          .print-document-header { display: none !important; }
          .print-page { break-after: auto !important; box-shadow: none !important; border: 0 !important; min-height: auto !important; padding: 0 !important; margin: 0 0 8mm !important; }
          .avoid-break { break-inside: auto; }
          .print-section { border: 0 !important; background: transparent !important; padding: 0 !important; }
          .print-grid { display: block !important; }
          .print-card { border: 0 !important; background: transparent !important; padding: 0 !important; }
          .print-label { color: #111827 !important; letter-spacing: 0 !important; text-transform: none !important; font-size: 12pt !important; margin-top: 6mm !important; }
          .print-body { color: #111827 !important; font-size: 10.5pt !important; line-height: 1.65 !important; }
          .print-title { color: #111827 !important; font-size: 18pt !important; line-height: 1.25 !important; margin-bottom: 4mm !important; }
          .print-muted { color: #374151 !important; }
          .print-footer { display: none !important; }
        }
      `}</style>

      <article className="mx-auto grid max-w-[1120px] gap-5">
        <section className="report-screen-hero print-page rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-xl">
          <Image src="/logo.svg" alt="Enbilir logo" width={128} height={128} className="print-logo print-only" />
          <p className="print-only print-body mb-4">{REPORT_PREFACE.tr}</p>
          <p className="print-only print-body mb-5">Sayın {recipientName},</p>

          <div className="print-document-header flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="screen-only mb-4 flex items-center gap-3">
                <Image src="/logo.svg" alt="Enbilir logo" width={52} height={52} className="rounded-md" />
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">Enbilir AI Makro Rapor</p>
                  <p className="text-sm font-bold text-slate-500">Dr. Hakan Ünsal&apos;ın eğittiği AI ajan tarafından hazırlanır.</p>
                </div>
              </div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">Planlı AI ajan raporu</p>
              <h1 className="mt-2 text-3xl font-black text-[#111827] md:text-5xl">{report.marketRegime ?? "Piyasa raporu"}</h1>
              <p className="mt-2 text-sm font-bold text-slate-500">
                {new Intl.DateTimeFormat("tr-TR", { dateStyle: "full", timeStyle: "short" }).format(report.generatedAt)} · {report.scope}
              </p>
            </div>
            <div className="screen-only flex flex-wrap gap-2">
              <Link href={`/${locale}/ai-piyasa-asistani/raporlar`} className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-700">
                Rapor listesi
              </Link>
              <PrintReportButton reportId={report.id} locale={locale} />
            </div>
          </div>

          <div className="screen-only mt-5 rounded-[1.15rem] border border-[#d1bfa7]/40 bg-[#fffaf6]/82 p-4 text-sm leading-7 text-[#49494b]">
            {REPORT_PREFACE.tr}
          </div>

          <ReportVisualDashboard locale="tr" stats={dashboardStats} riskAppetite={report.riskAppetite} marketRegime={report.marketRegime} />

          <div className="print-grid mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="report-screen-card print-section rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
              <p className="print-label text-xs font-black uppercase tracking-[0.16em] text-slate-500">Makro yorum</p>
              <p className="print-body mt-3 text-sm leading-7 text-slate-700">{report.macroSummary}</p>
              {report.newsSummary ? <p className="report-screen-note print-card print-body mt-4 rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-600">{report.newsSummary}</p> : null}
            </div>

            <aside className="report-screen-card print-section rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
              <p className="print-label text-xs font-black uppercase tracking-[0.16em] text-slate-500">Rejim</p>
              <div className="mt-3 grid gap-2">
                <Info label="Risk iştahı" value={report.riskAppetite ?? "-"} />
                <Info label="Model" value={report.model ?? (report.fallbackUsed ? "Kurallı fallback" : "-")} />
                <Info label="Kapsam" value={`${report.assets.length} varlık`} />
                <Info label="Periyot" value={isWeeklyReport ? "Haftalık" : "1 saat"} />
              </div>
            </aside>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {takeaways.map((item) => (
              <p key={item} className="report-takeaway-card print-card print-body rounded-md border border-slate-200 bg-white p-3 text-sm leading-6 text-slate-700">
                {item}
              </p>
            ))}
          </div>

          <div className="mt-5">
            <p className="print-label text-xs font-black uppercase tracking-[0.16em] text-slate-500">Zorunlu makro kapsam</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {requiredCoverage.map((item) => (
                <span key={item} className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-black text-slate-600">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>

        {chartAssets.map((asset, index) => {
          const source = readSourcePayload(asset.sourcePayload);
          const series = source.technicalSeries;

          if (!series) {
            return null;
          }

          return (
            <section key={asset.id} className="report-chart-section print-page avoid-break rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-xl">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
              <p className="print-label text-xs font-black uppercase tracking-[0.14em] text-[#0f766e]">Son 3 gün grafik seti {index + 1}</p>
                  <h2 className="print-title mt-1 text-2xl font-black text-[#111827]">{asset.displayName}</h2>
                  <p className="print-muted mt-1 text-sm font-bold text-slate-500">
                    Son: {formatNumber(asset.lastPrice)} · Değişim: {formatPercent(asset.changePercent)} · Sinyal: {formatSignal(asset.signalType)}
                  </p>
                </div>
                <span className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600">{source.interval ?? "1h"}</span>
              </div>

              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                <ChartCard title="Fiyat, EMA ve Bollinger">
                  <PriceChart series={series} />
                </ChartCard>
                <ChartCard title="Hacim ve ortalama hacim">
                  <VolumeChart series={series} />
                </ChartCard>
                <ChartCard title="RSI">
                  <SingleLineChart series={series} keys={["rsi"]} fixedMin={0} fixedMax={100} colors={["#0f766e"]} />
                </ChartCard>
                <ChartCard title="MACD">
                  <MacdChart series={series} />
                </ChartCard>
                <ChartCard title="Ichimoku bulutu">
                  <IchimokuChart series={series} />
                </ChartCard>
                <ChartCard title="ATR ve Bollinger bant genisligi">
                  <SingleLineChart series={series} keys={["atr", "bollingerBandwidth"]} colors={["#dc2626", "#2563eb"]} />
                </ChartCard>
              </div>
            </section>
          );
        })}

        <section className="report-assets-section print-page rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-xl">
          <div>
            <p className="print-label text-xs font-black uppercase tracking-[0.16em] text-slate-500">Varlik yorumlari</p>
            <h2 className="print-title mt-1 text-2xl font-black">Favoriler ve makro sepet</h2>
          </div>
          <div className="mt-4 grid gap-3">
            {report.assets.map((asset) => (
              <div key={asset.id} className="report-asset-card print-card avoid-break rounded-[1.15rem] border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{asset.category ?? asset.assetClass}</p>
                    <h3 className="mt-1 text-lg font-black">{asset.displayName}</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge>{formatNumber(asset.lastPrice)}</Badge>
                    <Badge>{formatPercent(asset.changePercent)}</Badge>
                    <Badge>{formatSignal(asset.signalType)}</Badge>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <Comment title="Teknik" body={asset.technicalCommentary} />
                  {asset.macroCommentary ? <Comment title="Makro" body={asset.macroCommentary} /> : null}
                  {asset.newsCommentary ? <Comment title="Haber" body={asset.newsCommentary} /> : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="report-news-section print-page rounded-[1.35rem] border border-slate-200 bg-white p-5 shadow-xl">
          <p className="print-label text-xs font-black uppercase tracking-[0.16em] text-slate-500">Kullanılan haber başlıkları</p>
          <div className="mt-3 grid gap-2">
            {report.newsItems.map((item) => (
              <a key={item.id} href={item.link} target="_blank" rel="noreferrer" className="print-card print-body rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 hover:border-[#0f766e]">
                <span className="font-black text-[#111827]">{item.source}</span> · {item.title}
              </a>
            ))}
          </div>
          <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 p-4 text-xs leading-5 text-amber-800">
            {report.disclaimer}
          </p>
          <div className="print-only print-body mt-8">
            <p>Saygılarımla...</p>
            <p className="mt-1 font-bold">Dr. Hakan Ünsal</p>
          </div>
        </section>
      </article>
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="print-card rounded-md border border-slate-200 bg-white p-3">
      <p className="print-label text-[10px] font-black uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="print-body mt-1 text-sm font-black text-slate-700">{value}</p>
    </div>
  );
}

function Badge({ children }: { children: string }) {
  return <span className="print-card rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-black text-slate-600">{children}</span>;
}

function Comment({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <p className="print-label text-[10px] font-black uppercase tracking-[0.14em] text-[#0f766e]">{title}</p>
      <p className="print-body mt-1 text-sm leading-6 text-slate-700">{body}</p>
    </div>
  );
}

function ReportVisualDashboard({
  locale,
  stats,
  riskAppetite,
  marketRegime,
}: {
  locale: "tr" | "en";
  stats: ReturnType<typeof getReportDashboardStats>;
  riskAppetite: string | null;
  marketRegime: string | null;
}) {
  const isEnglish = locale === "en";
  const riskTone = stats.averageRisk >= 70 ? "bg-red-50 text-red-700 border-red-200" : stats.averageRisk >= 45 ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-emerald-50 text-emerald-700 border-emerald-200";
  const signalEntries = Object.entries(stats.signalCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  return (
    <section className="report-visual-dashboard screen-only mt-5 rounded-[1.25rem] border border-slate-200 bg-white/86 p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
            {isEnglish ? "Visual report dashboard" : "Görsel rapor paneli"}
          </p>
          <h2 className="mt-1 text-2xl font-black text-[#111827]">
            {isEnglish ? "Risk, regime, signals, and asset heatmap" : "Risk, rejim, sinyal ve varlık ısı haritası"}
          </h2>
        </div>
        <span className={`rounded-full border px-3 py-1 text-sm font-black ${riskTone}`}>
          {isEnglish ? "Avg risk" : "Ort. risk"}: {stats.averageRisk}/100
        </span>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{isEnglish ? "Market frame" : "Piyasa çerçevesi"}</p>
          <p className="mt-3 text-lg font-black text-[#152033]">{marketRegime ?? (isEnglish ? "Not labeled" : "Etiket yok")}</p>
          <p className="mt-2 text-sm font-semibold text-slate-600">{riskAppetite ?? (isEnglish ? "Risk appetite not labeled" : "Risk iştahı etiketi yok")}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${Math.min(100, Math.max(0, stats.averageRisk))}%` }} />
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{isEnglish ? "Signal distribution" : "Sinyal dağılımı"}</p>
            <div className="mt-3 grid gap-2">
              {signalEntries.map(([signal, count]) => (
                <div key={signal} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-xs font-black text-slate-700">{formatSignal(signal === "NO_SIGNAL" ? null : signal, locale)}</span>
                  <span className="rounded-full bg-[#101827] px-2 py-1 text-xs font-black text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">{isEnglish ? "Highest risk notes" : "En yüksek risk notları"}</p>
            <div className="mt-3 grid gap-2">
              {stats.topRiskAssets.map((asset) => (
                <div key={asset.displayName} className="rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-black text-[#152033]">{asset.displayName}</p>
                    <p className="shrink-0 text-xs font-black text-red-700">{asset.riskScore}/100</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
        {stats.heatmap.slice(0, 8).map((item) => {
          const tone = item.averageChange >= 0 ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800";

          return (
            <div key={item.label} className={`rounded-2xl border p-3 ${tone}`}>
              <p className="text-xs font-black uppercase tracking-[0.12em] opacity-75">{item.label}</p>
              <p className="mt-2 text-lg font-black">{formatPercent(item.averageChange)}</p>
              <p className="mt-1 text-xs font-bold opacity-80">
                {item.count} {isEnglish ? "assets" : "varlık"} · {isEnglish ? "risk" : "risk"} {Math.round(item.risk)}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="print-card avoid-break rounded-md border border-slate-200 bg-slate-50 p-3">
      <p className="print-label text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

function SvgFrame({ children, points, min, max, yLabel = "Deger" }: { children: ReactNode; points: TechnicalSeriesPoint[]; min: number; max: number; yLabel?: string }) {
  const xTicks = getXAxisTicks(points, 360);
  const yTicks = getYAxisTicks(min, max, 150);

  return (
    <svg viewBox="0 0 430 196" className="h-[196px] w-full overflow-visible rounded bg-white" role="img">
      <rect x="0" y="0" width="430" height="196" fill="#ffffff" />
      <text x="8" y="18" fill="#64748b" fontSize="8" fontWeight="700">{yLabel}</text>
      <g transform="translate(48 14)">
        <rect x="0" y="0" width="360" height="150" fill="#ffffff" />
        {yTicks.map((tick) => (
          <g key={`${tick.y}-${tick.label}`}>
            <line x1="0" x2="360" y1={tick.y} y2={tick.y} stroke="#e2e8f0" strokeWidth="1" />
            <text x="-8" y={tick.y + 3} textAnchor="end" fill="#64748b" fontSize="8">{tick.label}</text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <g key={`${tick.x}-${tick.label}`}>
            <line x1={tick.x} x2={tick.x} y1="0" y2="150" stroke="#f1f5f9" strokeWidth="1" />
            <text x={tick.x} y="169" textAnchor="middle" fill="#64748b" fontSize="7">{tick.label}</text>
          </g>
        ))}
        <line x1="0" x2="0" y1="0" y2="150" stroke="#94a3b8" strokeWidth="1" />
        <line x1="0" x2="360" y1="150" y2="150" stroke="#94a3b8" strokeWidth="1" />
        {children}
      </g>
    </svg>
  );
}

function PriceChart({ series }: { series: TechnicalSeries }) {
  const points = compactPoints(series.points);
  const values = numericValues(points, ["close", "ema20", "ema50", "bollingerUpper", "bollingerLower"]);
  const { min, max } = valueRange(values);
  const band = areaPath(points, "bollingerUpper", "bollingerLower", 360, 150, min, max);

  return (
    <SvgFrame points={points} min={min} max={max} yLabel="Fiyat">
      {band ? <path d={band} fill="#dbeafe" opacity="0.65" /> : null}
      <path d={linePath(points, "close", 360, 150, min, max)} fill="none" stroke="#111827" strokeWidth="2.2" />
      <path d={linePath(points, "ema20", 360, 150, min, max)} fill="none" stroke="#0f766e" strokeWidth="1.5" />
      <path d={linePath(points, "ema50", 360, 150, min, max)} fill="none" stroke="#f59e0b" strokeWidth="1.5" />
    </SvgFrame>
  );
}

function VolumeChart({ series }: { series: TechnicalSeries }) {
  const points = compactPoints(series.points);
  const values = numericValues(points, ["volume", "volumeSma20"]);
  const { max } = valueRange(values, 0, 1);
  const barWidth = 360 / Math.max(points.length, 1);

  return (
    <SvgFrame points={points} min={0} max={max} yLabel="Hacim">
      {points.map((point, index) => {
        const height = Math.max(1, (point.volume / max) * 125);
        return <rect key={`${point.time}-volume`} x={index * barWidth} y={140 - height} width={Math.max(1, barWidth - 1)} height={height} fill="#94a3b8" />;
      })}
      <path d={linePath(points, "volumeSma20", 360, 150, 0, max)} fill="none" stroke="#0f766e" strokeWidth="1.8" />
    </SvgFrame>
  );
}

function SingleLineChart({
  series,
  keys,
  colors,
  fixedMin,
  fixedMax,
}: {
  series: TechnicalSeries;
  keys: Array<keyof TechnicalSeriesPoint>;
  colors: string[];
  fixedMin?: number;
  fixedMax?: number;
}) {
  const points = compactPoints(series.points);
  const values = numericValues(points, keys);
  const range = valueRange(values);
  const min = fixedMin ?? range.min;
  const max = fixedMax ?? range.max;

  return (
    <SvgFrame points={points} min={min} max={max} yLabel="Değer">
      {keys.map((key, index) => (
        <path key={String(key)} d={linePath(points, key, 360, 150, min, max)} fill="none" stroke={colors[index] ?? "#111827"} strokeWidth="2" />
      ))}
    </SvgFrame>
  );
}

function MacdChart({ series }: { series: TechnicalSeries }) {
  const points = compactPoints(series.points);
  const values = numericValues(points, ["macd", "macdSignal", "macdHistogram"]);
  const { min, max } = valueRange(values, -1, 1);
  const barWidth = 360 / Math.max(points.length, 1);
  const zeroY = scale(0, min, max, 150);

  return (
    <SvgFrame points={points} min={min} max={max} yLabel="MACD">
      <line x1="0" x2="360" y1={zeroY} y2={zeroY} stroke="#cbd5e1" strokeWidth="1" />
      {points.map((point, index) => {
        const value = point.macdHistogram ?? 0;
        const y = scale(value, min, max, 150);
        return <rect key={`${point.time}-macd`} x={index * barWidth} y={Math.min(y, zeroY)} width={Math.max(1, barWidth - 1)} height={Math.max(1, Math.abs(zeroY - y))} fill={value >= 0 ? "#0f766e" : "#dc2626"} opacity="0.75" />;
      })}
      <path d={linePath(points, "macd", 360, 150, min, max)} fill="none" stroke="#111827" strokeWidth="1.8" />
      <path d={linePath(points, "macdSignal", 360, 150, min, max)} fill="none" stroke="#f59e0b" strokeWidth="1.8" />
    </SvgFrame>
  );
}

function IchimokuChart({ series }: { series: TechnicalSeries }) {
  const points = compactPoints(series.points);
  const values = numericValues(points, ["close", "ichimokuConversion", "ichimokuBase", "ichimokuSpanA", "ichimokuSpanB"]);
  const { min, max } = valueRange(values);
  const cloud = areaPath(points, "ichimokuSpanA", "ichimokuSpanB", 360, 150, min, max);

  return (
    <SvgFrame points={points} min={min} max={max} yLabel="Fiyat">
      {cloud ? <path d={cloud} fill="#bbf7d0" opacity="0.55" /> : null}
      <path d={linePath(points, "close", 360, 150, min, max)} fill="none" stroke="#111827" strokeWidth="2" />
      <path d={linePath(points, "ichimokuConversion", 360, 150, min, max)} fill="none" stroke="#2563eb" strokeWidth="1.5" />
      <path d={linePath(points, "ichimokuBase", 360, 150, min, max)} fill="none" stroke="#dc2626" strokeWidth="1.5" />
    </SvgFrame>
  );
}
