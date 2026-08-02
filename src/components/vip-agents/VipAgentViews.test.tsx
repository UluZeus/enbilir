import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { VipAgentDetailView } from "./VipAgentViews";

const awaitingFirstExecutionAgent = {
  slug: "sabit",
  name: "SABİT",
  description: "Sermaye koruma odaklı sanal ajan.",
  latestSnapshotAt: new Date("2026-08-02T08:00:00.000Z"),
  lastRunAt: new Date("2026-08-02T08:00:00.000Z"),
  totalBalanceUsd: 1_100_000,
  totalPnlUsd: 0,
  totalReturnPercent: 0,
  deployableCashUsd: 1_000_000,
  reserveUsd: 100_000,
  positionsValueUsd: 0,
  positions: [],
  realizedPnlUsd: 0,
  unrealizedPnlUsd: 0,
  maximumDrawdownPercent: 0,
  equityHistory: [{
    capturedAt: new Date("2026-08-02T08:00:00.000Z"),
    performanceEquityUsd: 1_000_000,
    returnPercent: 0,
  }],
  periods: [{ key: "daily", labelTr: "Günlük", labelEn: "Daily", returnPercent: 0, pnlUsd: 0, isPartial: false }],
  trades: [],
  decisions: [],
  _count: { trades: 0, decisions: 0 },
  tradePagination: { page: 1, pageSize: 25, totalItems: 0, totalPages: 0, firstItem: 0, lastItem: 0, hasPreviousPage: false, hasNextPage: false },
  decisionPagination: { page: 1, pageSize: 25, totalItems: 0, totalPages: 0, firstItem: 0, lastItem: 0, hasPreviousPage: false, hasNextPage: false },
} as unknown as Parameters<typeof VipAgentDetailView>[0]["agent"];

describe("VipAgentDetailView awaiting-first-execution state", () => {
  it("explains cash waiting honestly instead of rendering a flat performance chart", () => {
    const html = renderToStaticMarkup(
      <VipAgentDetailView agent={awaitingFirstExecutionAgent} locale="tr" />,
    );

    expect(html).toContain("Henüz sanal işlem açılmadı");
    expect(html).toContain("doğrulanmış ve işleme uygun piyasa fiyatı");
    expect(html).toContain("Son değerlendirme");
    expect(html).not.toContain("özsermaye eğrisi");
  });
});
