import { describe, expect, it } from "vitest";
import { isLeagueInviteTargetMatch } from "@/lib/leagues";

describe("league invitation target binding", () => {
  const league = { id: "league-a", slug: "private-a" };

  it("accepts a code only for its intended league target", () => {
    expect(isLeagueInviteTargetMatch(league, { leagueId: "league-a", leagueSlug: "private-a" })).toBe(true);
    expect(isLeagueInviteTargetMatch(league, { leagueId: "league-b" })).toBe(false);
    expect(isLeagueInviteTargetMatch(league, { leagueSlug: "private-b" })).toBe(false);
  });

  it("allows lookup flows with no additional target constraint", () => {
    expect(isLeagueInviteTargetMatch(league, {})).toBe(true);
  });
});
