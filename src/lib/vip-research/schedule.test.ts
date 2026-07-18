import { describe, expect, it } from "vitest";
import { getIstanbulClock, isVipResearchScheduleWindow } from "@/lib/vip-research/schedule";

describe("VIP research 07:00 schedule window", () => {
  it.each([
    ["2026-07-18T04:00:00.000Z", 7, 0],
    ["2026-07-18T04:31:00.000Z", 7, 31],
    ["2026-07-18T04:59:59.999Z", 7, 59],
  ])("accepts the complete Istanbul 07:00 hour at %s", (timestamp, hour, minute) => {
    const date = new Date(timestamp);

    expect(getIstanbulClock(date)).toEqual({ hour, minute });
    expect(isVipResearchScheduleWindow(date)).toBe(true);
  });

  it.each([
    "2026-07-18T03:59:59.999Z",
    "2026-07-18T05:00:00.000Z",
  ])("rejects times outside the Istanbul 07:00 hour at %s", (timestamp) => {
    expect(isVipResearchScheduleWindow(new Date(timestamp))).toBe(false);
  });
});
