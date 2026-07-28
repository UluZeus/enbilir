import { beforeEach, describe, expect, it, vi } from "vitest";

const publisherMocks = vi.hoisted(() => ({
  userFindMany: vi.fn(),
  positionFindMany: vi.fn(),
  publicationFindUnique: vi.fn(),
  baselineFindMany: vi.fn(),
  transaction: vi.fn(),
  baselineUpsert: vi.fn(),
  publicationCreate: vi.fn(),
  publicationFindUniqueOrThrow: vi.fn(),
  getMarketItems: vi.fn(),
  getPortfolioSnapshot: vi.fn(),
  appendAudit: vi.fn(),
}));

const transactionClient = {
  weeklyPortfolioBaseline: { upsert: publisherMocks.baselineUpsert },
  weeklyCompetitionPublication: {
    create: publisherMocks.publicationCreate,
    findUniqueOrThrow: publisherMocks.publicationFindUniqueOrThrow,
  },
};

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findMany: publisherMocks.userFindMany },
    portfolioPosition: { findMany: publisherMocks.positionFindMany },
    weeklyCompetitionPublication: { findUnique: publisherMocks.publicationFindUnique },
    weeklyPortfolioBaseline: { findMany: publisherMocks.baselineFindMany },
    $transaction: publisherMocks.transaction,
  },
}));

vi.mock("@/lib/auth", () => ({
  getDisplayName: (user: { name: string }) => user.name,
}));

vi.mock("@/lib/live-market", () => ({
  getLiveMarketItemsForSymbols: publisherMocks.getMarketItems,
}));

vi.mock("@/lib/portfolio", () => ({
  initialCashUsd: 1_000_000,
  getPortfolioSnapshot: publisherMocks.getPortfolioSnapshot,
}));

vi.mock("@/lib/audit-log", () => ({
  appendAuditEvent: publisherMocks.appendAudit,
}));

import { publishWeeklyCompetition } from "@/lib/weekly-competition-publisher";

describe("release gate: immutable weekly competition publication", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    publisherMocks.userFindMany.mockResolvedValue([
      {
        id: "user-1",
        name: "Eligible User",
        nickname: null,
        displayNameMode: "REAL_NAME",
        email: "eligible@example.test",
        role: "USER",
      },
    ]);
    publisherMocks.positionFindMany.mockResolvedValue([]);
    publisherMocks.baselineFindMany.mockResolvedValue([
      { userId: "user-1", portfolioValueUsd: 1_000_000 },
    ]);
    publisherMocks.getMarketItems.mockResolvedValue([]);
    publisherMocks.getPortfolioSnapshot.mockResolvedValue({
      totalValueUsd: 1_050_000,
      hasUnreliableValuation: false,
    });
    publisherMocks.baselineUpsert.mockResolvedValue({});
    publisherMocks.publicationCreate.mockResolvedValue({ id: "publication-new" });
    publisherMocks.appendAudit.mockResolvedValue({ id: "audit-1" });
    publisherMocks.transaction.mockImplementation(
      (callback: (transaction: typeof transactionClient) => unknown) => callback(transactionClient),
    );
  });

  it("does not overwrite an already-published week", async () => {
    publisherMocks.publicationFindUnique.mockResolvedValue({ id: "publication-existing" });

    const result = await publishWeeklyCompetition(new Date("2026-07-28T07:00:00.000Z"));

    expect(result).toMatchObject({
      reused: true,
      publicationId: "publication-existing",
      includedUsers: 1,
      excludedUsers: 0,
    });
    expect(publisherMocks.publicationCreate).not.toHaveBeenCalled();
    expect(publisherMocks.appendAudit).not.toHaveBeenCalled();
  });

  it("publishes deterministic percentage rankings from verified users and baselines", async () => {
    publisherMocks.publicationFindUnique.mockResolvedValue(null);

    const result = await publishWeeklyCompetition(new Date("2026-07-28T07:00:00.000Z"));

    expect(publisherMocks.userFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        isActive: true,
        emailVerifiedAt: { not: null },
      },
    }));
    expect(publisherMocks.publicationCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        periodKey: "2026-07-27",
        rows: {
          create: [
            expect.objectContaining({
              scope: "WEEKLY_GAIN",
              userId: "user-1",
              valueUsd: 50_000,
              returnPercent: 5,
              rank: 1,
            }),
            expect.objectContaining({
              scope: "TOTAL_GAIN",
              userId: "user-1",
              valueUsd: 50_000,
              returnPercent: 5,
              rank: 1,
            }),
          ],
        },
      }),
      select: { id: true },
    });
    expect(publisherMocks.appendAudit).toHaveBeenCalledWith(
      transactionClient,
      expect.objectContaining({
        category: "LEAGUE",
        entityType: "WeeklyCompetitionPublication",
        action: "WEEKLY_RESULTS_PUBLISHED",
      }),
    );
    expect(result).toMatchObject({
      reused: false,
      publicationId: "publication-new",
      weeklyRows: 1,
      totalRows: 1,
    });
  });
});
