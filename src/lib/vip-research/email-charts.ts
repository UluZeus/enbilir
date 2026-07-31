import { MACRO_REPORT_CHART_SELECTION } from "@/lib/ai-market/report-chart-selection";

type EmailChartSourceAsset = {
  symbol: string;
  displayName: string;
  lastPrice: number | null;
  sourcePayload: unknown;
};

type EmailChartPoint = {
  time: number;
  close: number;
};

export type VipEmailChart = {
  symbol: string;
  label: string;
  lastPrice: number | null;
  changePercent3d: number | null;
  direction: "YUKARI" | "ASAGI" | "YATAY" | "VERI_YOK";
  normalizedSamples: number[];
  asOf: string | null;
  freshness: "CURRENT" | "STALE" | "FUTURE" | "UNAVAILABLE";
  imageAlt: string;
};

export type VipEmailChartAttachment = {
  filename: string;
  content: Buffer;
  contentType: "image/png";
  contentDisposition: "inline";
  cid: string;
};

const MAX_MARKET_CLOSURE_AGE_MS = 96 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 15 * 60 * 1000;
const MAX_HTML_SAMPLES = 8;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readTimestamp(value: unknown) {
  if (typeof value !== "string" || value.trim().length === 0) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
}

function readThreeDaySeries(sourcePayload: unknown) {
  const payload = record(sourcePayload);
  const technicalSeries = record(payload?.technicalSeries);
  const rawPoints = Array.isArray(technicalSeries?.points) ? technicalSeries.points : [];
  const points = rawPoints.flatMap((value): EmailChartPoint[] => {
    const point = record(value);
    const normalizedTime = finite(point?.time) && point.time < 1_000_000_000_000 ? point.time * 1000 : point?.time;
    return finite(normalizedTime) && finite(point?.close) && point.close > 0
      ? [{ time: normalizedTime, close: point.close }]
      : [];
  }).sort((left, right) => left.time - right.time);
  const uniquePoints = Array.from(new Map(points.map((point) => [point.time, point])).values());

  if (uniquePoints.length < 2) return { points: [] as EmailChartPoint[], sourceAsOf: readTimestamp(payload?.sourceAsOf) };

  const latestTime = uniquePoints.at(-1)?.time ?? 0;
  const threeDaysInMilliseconds = 72 * 60 * 60 * 1000;
  const timeWindow = uniquePoints.filter((point) => point.time >= latestTime - threeDaysInMilliseconds);

  return {
    points: timeWindow.length >= 2 ? timeWindow : [],
    sourceAsOf: readTimestamp(payload?.sourceAsOf),
  };
}

function calculateDirection(changePercent: number | null): VipEmailChart["direction"] {
  if (!finite(changePercent)) return "VERI_YOK";
  if (changePercent > 0.25) return "YUKARI";
  if (changePercent < -0.25) return "ASAGI";
  return "YATAY";
}

function samplePoints(points: EmailChartPoint[]) {
  if (points.length <= MAX_HTML_SAMPLES) return points;

  return Array.from({ length: MAX_HTML_SAMPLES }, (_, index) => {
    const pointIndex = Math.round(index * (points.length - 1) / (MAX_HTML_SAMPLES - 1));
    return points[pointIndex];
  });
}

function normalizePoints(points: EmailChartPoint[]) {
  const sampled = samplePoints(points);
  const closes = sampled.map((point) => point.close);
  const minimum = Math.min(...closes);
  const maximum = Math.max(...closes);
  const spread = maximum - minimum;

  return spread === 0
    ? sampled.map(() => 50)
    : sampled.map((point) => Math.round((point.close - minimum) / spread * 100));
}

function freshnessFor(reportGeneratedAt: Date, latestPointTime: number, sourceAsOf: number | null) {
  const timestamps = [latestPointTime];
  if (sourceAsOf !== null) {
    if (!Number.isFinite(sourceAsOf)) return "UNAVAILABLE" as const;
    timestamps.push(sourceAsOf);
  }

  if (timestamps.some((timestamp) => timestamp > reportGeneratedAt.getTime() + MAX_FUTURE_SKEW_MS)) {
    return "FUTURE" as const;
  }
  if (timestamps.some((timestamp) => reportGeneratedAt.getTime() - timestamp > MAX_MARKET_CLOSURE_AGE_MS)) {
    return "STALE" as const;
  }
  return "CURRENT" as const;
}

export async function buildVipEmailChartSet(
  _reportId: string,
  reportGeneratedAt: Date,
  assets: EmailChartSourceAsset[],
) {
  const bySymbol = new Map(assets.map((asset) => [asset.symbol.toUpperCase(), asset]));
  const attachments: VipEmailChartAttachment[] = [];
  const charts: VipEmailChart[] = [];
  const failedSymbols: string[] = [];
  const unavailableSymbols: string[] = [];

  for (const selection of MACRO_REPORT_CHART_SELECTION) {
    const asset = bySymbol.get(selection.symbol.toUpperCase());
    const series = asset ? readThreeDaySeries(asset.sourcePayload) : { points: [], sourceAsOf: null };
    const latestPointTime = series.points.at(-1)?.time ?? null;
    const freshness = latestPointTime === null
      ? "UNAVAILABLE" as const
      : freshnessFor(reportGeneratedAt, latestPointTime, series.sourceAsOf);
    const usablePoints = freshness === "CURRENT" ? series.points : [];
    const firstClose = usablePoints.at(0)?.close;
    const lastClose = usablePoints.at(-1)?.close;
    const changePercent3d = finite(firstClose) && finite(lastClose) && firstClose !== 0
      ? (lastClose / firstClose - 1) * 100
      : null;

    if (usablePoints.length < 2) unavailableSymbols.push(selection.symbol);

    const asOfTime = series.sourceAsOf !== null && Number.isFinite(series.sourceAsOf)
      ? series.sourceAsOf
      : latestPointTime;
    charts.push({
      symbol: selection.symbol,
      label: selection.label,
      lastPrice: finite(lastClose) ? lastClose : null,
      changePercent3d,
      direction: calculateDirection(changePercent3d),
      normalizedSamples: normalizePoints(usablePoints),
      asOf: asOfTime === null ? null : new Date(asOfTime).toISOString(),
      freshness,
      imageAlt: `${selection.label} son üç günlük fiyat eğrisi`,
    });
  }

  return {
    charts,
    attachments,
    expectedChartCount: MACRO_REPORT_CHART_SELECTION.length,
    renderedChartCount: charts.filter((chart) => chart.normalizedSamples.length >= 2).length,
    failedSymbols,
    unavailableSymbols,
  };
}
