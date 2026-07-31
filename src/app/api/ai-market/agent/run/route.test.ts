import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  runAiMarketAgent: vi.fn(),
  sendMorningMacroReportEmails: vi.fn(),
  sendWeeklyMacroReportEmails: vi.fn(),
  captureActivePortfolioEquitySnapshots: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: mocks.findMany } },
}));
vi.mock("@/lib/cron-auth", () => ({ isCronRequestAuthorized: () => true }));
vi.mock("@/lib/portfolio-history", () => ({
  captureActivePortfolioEquitySnapshots: mocks.captureActivePortfolioEquitySnapshots,
}));
vi.mock("@/lib/ai-market/agent/report-agent", () => ({ runAiMarketAgent: mocks.runAiMarketAgent }));
vi.mock("@/lib/ai-market/agent/morning-report-email", () => ({
  sendMorningMacroReportEmails: mocks.sendMorningMacroReportEmails,
  sendWeeklyMacroReportEmails: mocks.sendWeeklyMacroReportEmails,
}));

describe("AI market agent daily delivery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-28T04:00:00.000Z")); // Salı, 07:00 TSİ
    mocks.findMany.mockResolvedValue([{ id: "user-1" }]);
    mocks.runAiMarketAgent.mockResolvedValue({ reportId: "report-1", reused: false });
    mocks.captureActivePortfolioEquitySnapshots.mockResolvedValue({ capturedUsers: 1 });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it("does not query or send the obsolete link-only morning email", async () => {
    const { POST } = await import("@/app/api/ai-market/agent/run/route");
    const response = await POST(new Request("https://example.test/api/ai-market/agent/run"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.findMany).toHaveBeenCalledTimes(1);
    expect(mocks.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true },
      take: 20,
    });
    expect(mocks.sendMorningMacroReportEmails).not.toHaveBeenCalled();
    expect(body).not.toHaveProperty("morningEmailResult");
    expect(mocks.sendWeeklyMacroReportEmails).not.toHaveBeenCalled();
  });

  it("keeps the Monday weekly email behavior", async () => {
    vi.setSystemTime(new Date("2026-07-27T04:00:00.000Z")); // Pazartesi, 07:00 TSİ
    mocks.findMany
      .mockResolvedValueOnce([{ id: "user-1" }])
      .mockResolvedValueOnce([{ id: "recipient-1", email: "member@example.test", name: "Üye" }]);
    mocks.runAiMarketAgent
      .mockResolvedValueOnce({ reportId: "daily-1", reused: false })
      .mockResolvedValueOnce({ reportId: "user-report-1", reused: false })
      .mockResolvedValueOnce({ reportId: "weekly-1", reused: false });
    mocks.sendWeeklyMacroReportEmails.mockResolvedValue({ sent: 1, failed: 0 });

    const { POST } = await import("@/app/api/ai-market/agent/run/route");
    const response = await POST(new Request("https://example.test/api/ai-market/agent/run"));
    const body = await response.json();

    expect(mocks.runAiMarketAgent).toHaveBeenLastCalledWith({ force: false, reportMode: "WEEKLY" });
    expect(mocks.sendWeeklyMacroReportEmails).toHaveBeenCalledWith({
      reportId: "weekly-1",
      recipients: [{ id: "recipient-1", email: "member@example.test", name: "Üye" }],
    });
    expect(body.weeklyEmailResult).toEqual({ sent: 1, failed: 0 });
    expect(body).not.toHaveProperty("morningEmailResult");
  });
});
