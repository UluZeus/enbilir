import { beforeEach, describe, expect, it, vi } from "vitest";
import { publicCompetitionUserWhere } from "@/lib/public-user-visibility";

const summaryMocks = vi.hoisted(() => ({
  publicationFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    weeklyCompetitionPublication: { findFirst: summaryMocks.publicationFindFirst },
  },
}));

import { getWeeklyCompetitionSummary } from "@/lib/weekly-competition-summary";

const publicationBase = {
  periodKey: "2026-07-27",
  startsAt: new Date("2026-07-20T21:00:00.000Z"),
  endsAt: new Date("2026-07-27T21:00:00.000Z"),
  publishedAt: new Date("2026-07-28T04:00:00.000Z"),
  note: "Synthetic publication",
};

describe("weekly competition summary privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["tr" as const, "Gizli katılımcı"],
    ["en" as const, "Private participant"],
  ])("ignores unsafe persisted names and uses the localized fallback for %s", async (locale, fallback) => {
    summaryMocks.publicationFindFirst.mockResolvedValue({
      ...publicationBase,
      rows: [{
        userId: "viewer",
        scope: "WEEKLY_GAIN",
        displayName: "historical.private@example.test",
        valueUsd: 50_000,
        returnPercent: 5,
        rank: 1,
        user: {
          name: "viewer",
          nickname: "Hidden Alternate",
          displayNameMode: "REAL_NAME",
          email: "viewer@example.test",
          isActive: true,
          emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      }],
    });

    const summary = await getWeeklyCompetitionSummary(locale, "viewer");

    expect(summary.weeklyTop[0]).toMatchObject({
      userId: "viewer",
      displayName: fallback,
      rank: 1,
      valueUsd: 50_000,
      returnPercent: 5,
    });
    expect(summary.currentUserWeeklyRank).toBe(1);
    expect(JSON.stringify(summary)).not.toContain("historical.private@example.test");
    expect(JSON.stringify(summary)).not.toContain("viewer@example.test");
    expect(JSON.stringify(summary)).not.toContain("Hidden Alternate");
  });

  it("uses the current selected safe label instead of a historical persisted label", async () => {
    summaryMocks.publicationFindFirst.mockResolvedValue({
      ...publicationBase,
      rows: [{
        userId: "member",
        scope: "TOTAL_GAIN",
        displayName: "Stale Historical Label",
        valueUsd: 80_000,
        returnPercent: 8,
        rank: 2,
        user: {
          name: "Hidden Real Name",
          nickname: "Current Public Nick",
          displayNameMode: "NICKNAME",
          email: "private.member@example.test",
          isActive: true,
          emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      }],
    });

    const summary = await getWeeklyCompetitionSummary("en", "member");

    expect(summary.totalTop[0]?.displayName).toBe("Current Public Nick");
    expect(summary.currentUserTotalRank).toBe(2);
    expect(JSON.stringify(summary)).not.toContain("Stale Historical Label");
    expect(JSON.stringify(summary)).not.toContain("Hidden Real Name");
  });

  it("excludes rows whose users are no longer active and verified", async () => {
    summaryMocks.publicationFindFirst.mockResolvedValue({
      ...publicationBase,
      rows: [{
        userId: "suspended-member",
        scope: "WEEKLY_GAIN",
        valueUsd: 90_000,
        returnPercent: 9,
        rank: 1,
        user: {
          name: "Former Public Name",
          nickname: null,
          displayNameMode: "REAL_NAME",
          email: "suspended@example.test",
          isActive: false,
          emailVerifiedAt: new Date("2026-01-01T00:00:00.000Z"),
        },
      }, {
        userId: "unverified-member",
        scope: "TOTAL_GAIN",
        valueUsd: 80_000,
        returnPercent: 8,
        rank: 2,
        user: {
          name: "Unverified Public Name",
          nickname: null,
          displayNameMode: "REAL_NAME",
          email: "unverified@example.test",
          isActive: true,
          emailVerifiedAt: null,
        },
      }],
    });

    const summary = await getWeeklyCompetitionSummary("tr", "suspended-member");

    expect(summary.weeklyTop).toEqual([]);
    expect(summary.totalTop).toEqual([]);
    expect(summary.currentUserWeeklyRank).toBeNull();
    expect(summary.currentUserTotalRank).toBeNull();
    expect(JSON.stringify(summary)).not.toContain("Former Public Name");
    expect(JSON.stringify(summary)).not.toContain("Unverified Public Name");
  });

  it("filters and selects only the current user fields required for public labels", async () => {
    summaryMocks.publicationFindFirst.mockResolvedValue(null);

    await getWeeklyCompetitionSummary("tr");

    expect(summaryMocks.publicationFindFirst).toHaveBeenCalledWith(expect.objectContaining({
      include: {
        rows: expect.objectContaining({
          where: {
            user: { is: publicCompetitionUserWhere },
          },
          select: expect.objectContaining({
            user: {
              select: {
                name: true,
                nickname: true,
                displayNameMode: true,
                email: true,
                isActive: true,
                emailVerifiedAt: true,
              },
            },
          }),
        }),
      },
    }));
  });
});
