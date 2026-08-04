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
    findUnique: publisherMocks.publicationFindUnique,
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
import { Prisma } from "@/generated/prisma/client";
import { decimalToNumber } from "@/lib/decimal";

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
              displayName: "Eligible User",
              valueUsd: expect.any(Prisma.Decimal),
              returnPercent: expect.any(Prisma.Decimal),
              rank: 1,
            }),
            expect.objectContaining({
              scope: "TOTAL_GAIN",
              userId: "user-1",
              displayName: "Eligible User",
              valueUsd: expect.any(Prisma.Decimal),
              returnPercent: expect.any(Prisma.Decimal),
              rank: 1,
            }),
          ],
        },
      }),
      select: { id: true },
    });
    const createdRows = publisherMocks.publicationCreate.mock.calls[0][0].data.rows.create;
    expect(createdRows.map((row: { valueUsd: Prisma.Decimal; returnPercent: Prisma.Decimal }) => ({
      valueUsd: decimalToNumber(row.valueUsd),
      returnPercent: decimalToNumber(row.returnPercent),
    }))).toEqual([
      { valueUsd: 50_000, returnPercent: 5 },
      { valueUsd: 50_000, returnPercent: 5 },
    ]);
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

  it("persists an empty sentinel when the selected label matches the stored email local-part", async () => {
    publisherMocks.publicationFindUnique.mockResolvedValue(null);
    publisherMocks.userFindMany.mockResolvedValue([{
      id: "user-private",
      name: "PRIVATE.MEMBER",
      nickname: "Hidden Alternate",
      displayNameMode: "REAL_NAME",
      email: "private.member@example.test",
      role: "USER",
    }]);
    publisherMocks.baselineFindMany.mockResolvedValue([
      { userId: "user-private", portfolioValueUsd: 1_000_000 },
    ]);

    await publishWeeklyCompetition(new Date("2026-07-28T07:00:00.000Z"));

    const createdRows = publisherMocks.publicationCreate.mock.calls[0]?.[0]?.data?.rows?.create;
    expect(createdRows).toEqual([
      expect.objectContaining({ userId: "user-private", scope: "WEEKLY_GAIN", displayName: "" }),
      expect.objectContaining({ userId: "user-private", scope: "TOTAL_GAIN", displayName: "" }),
    ]);
    expect(JSON.stringify(createdRows)).not.toContain("private.member@example.test");
    expect(JSON.stringify(createdRows)).not.toContain("Hidden Alternate");
  });
});
