import sharp from "sharp";
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
  imageSrc: string | null;
  imageAlt: string;
};

export type VipEmailChartAttachment = {
  filename: string;
  content: Buffer;
  contentType: "image/png";
  contentDisposition: "inline";
  cid: string;
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function readThreeDayPoints(sourcePayload: unknown) {
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

  if (uniquePoints.length < 2) return [];

  const latestTime = uniquePoints.at(-1)?.time ?? 0;
  const threeDaysInMilliseconds = 72 * 60 * 60 * 1000;
  const timeWindow = uniquePoints.filter((point) => point.time >= latestTime - threeDaysInMilliseconds);

  return timeWindow.length >= 2 ? timeWindow : [];
}

function safeId(value: string) {
  return value.toLocaleLowerCase("en-US").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "chart";
}

function calculateDirection(changePercent: number | null): VipEmailChart["direction"] {
  if (!finite(changePercent)) return "VERI_YOK";
  if (changePercent > 0.25) return "YUKARI";
  if (changePercent < -0.25) return "ASAGI";
  return "YATAY";
}

function chartSvg(points: EmailChartPoint[], positive: boolean) {
  const width = 600;
  const height = 180;
  const paddingX = 18;
  const paddingY = 18;
  const closes = points.map((point) => point.close);
  const rawMinimum = Math.min(...closes);
  const rawMaximum = Math.max(...closes);
  const spread = Math.max(rawMaximum - rawMinimum, Math.abs(rawMaximum) * 0.002, 0.01);
  const minimum = rawMinimum - spread * 0.12;
  const maximum = rawMaximum + spread * 0.12;
  const xStep = (width - paddingX * 2) / Math.max(1, points.length - 1);
  const coordinates = points.map((point, index) => {
    const x = paddingX + index * xStep;
    const y = paddingY + (maximum - point.close) / (maximum - minimum) * (height - paddingY * 2);
    return { x, y };
  });
  const line = coordinates.map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(" ");
  const area = `${line} L${(width - paddingX).toFixed(2)} ${(height - paddingY).toFixed(2)} L${paddingX.toFixed(2)} ${(height - paddingY).toFixed(2)} Z`;
  const last = coordinates.at(-1) ?? { x: width - paddingX, y: height / 2 };
  const stroke = positive ? "#0f9f82" : "#d64f68";
  const fill = positive ? "#d7f4ec" : "#fde4e9";

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    <rect width="${width}" height="${height}" rx="18" fill="#f7f9fb"/>
    <path d="M18 45 H582 M18 90 H582 M18 135 H582" fill="none" stroke="#e4e9ee" stroke-width="2"/>
    <path d="${area}" fill="${fill}" opacity="0.82"/>
    <path d="${line}" fill="none" stroke="${stroke}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${last.x.toFixed(2)}" cy="${last.y.toFixed(2)}" r="8" fill="#ffffff" stroke="${stroke}" stroke-width="5"/>
  </svg>`;
}

async function renderChartAttachment(reportId: string, symbol: string, points: EmailChartPoint[], positive: boolean) {
  const baseName = `${safeId(reportId)}-${safeId(symbol)}`;
  const cid = `vip-${baseName}@enbilir`;
  const content = await sharp(Buffer.from(chartSvg(points, positive)))
    .png({ compressionLevel: 9, palette: true, colors: 64 })
    .toBuffer();

  return {
    attachment: {
      filename: `${baseName}.png`,
      content,
      contentType: "image/png" as const,
      contentDisposition: "inline" as const,
      cid,
    },
    imageSrc: `cid:${cid}`,
  };
}

export async function buildVipEmailChartSet(reportId: string, assets: EmailChartSourceAsset[]) {
  const bySymbol = new Map(assets.map((asset) => [asset.symbol.toUpperCase(), asset]));
  const attachments: VipEmailChartAttachment[] = [];
  const charts: VipEmailChart[] = [];
  const failedSymbols: string[] = [];
  const unavailableSymbols: string[] = [];

  for (const selection of MACRO_REPORT_CHART_SELECTION) {
    const asset = bySymbol.get(selection.symbol.toUpperCase());
    const points = asset ? readThreeDayPoints(asset.sourcePayload) : [];
    const firstClose = points.at(0)?.close;
    const lastClose = points.at(-1)?.close;
    const changePercent3d = finite(firstClose) && finite(lastClose) && firstClose !== 0
      ? (lastClose / firstClose - 1) * 100
      : null;
    const direction = calculateDirection(changePercent3d);
    let imageSrc: string | null = null;

    if (points.length >= 2) {
      try {
        const rendered = await renderChartAttachment(reportId, selection.symbol, points, (changePercent3d ?? 0) >= 0);
        attachments.push(rendered.attachment);
        imageSrc = rendered.imageSrc;
      } catch (error) {
        failedSymbols.push(selection.symbol);
        console.warn("[vip-email-chart] Grafik oluşturulamadı.", {
          reportId,
          symbol: selection.symbol,
          message: error instanceof Error ? error.message : "Bilinmeyen hata",
        });
        imageSrc = null;
      }
    } else {
      unavailableSymbols.push(selection.symbol);
    }

    charts.push({
      symbol: selection.symbol,
      label: selection.label,
      lastPrice: finite(lastClose) ? lastClose : asset?.lastPrice ?? null,
      changePercent3d,
      direction,
      imageSrc,
      imageAlt: `${selection.label} son üç günlük fiyat eğrisi`,
    });
  }

  return {
    charts,
    attachments,
    renderedChartCount: attachments.length,
    failedSymbols,
    unavailableSymbols,
  };
}
