import { describe, expect, it } from "vitest";
import { getAiMarketReportAccessFilter } from "@/lib/report-visibility";

describe("AI market report visibility", () => {
  it("does not expose a private report to anonymous metadata requests", () => {
    expect(getAiMarketReportAccessFilter("report-1", null)).toEqual({
      id: "report-1",
      scope: { in: ["GLOBAL", "WEEKLY"] },
    });
  });

  it("allows a signed-in user to see own and public reports only", () => {
    expect(getAiMarketReportAccessFilter("report-1", "user-1")).toEqual({
      id: "report-1",
      OR: [
        { userId: "user-1" },
        { scope: { in: ["GLOBAL", "WEEKLY"] } },
      ],
    });
  });
});
