import { describe, expect, it } from "vitest";
import {
  buildAiQueryQuota,
  getDailyAiQueryLimit,
  getIstanbulAiQueryWindow,
} from "@/lib/ai-query-policy";

describe("daily AI query policy", () => {
  it("allows ten daily queries to promotional members and fifteen to paid VIP members", () => {
    expect(getDailyAiQueryLimit(false)).toBe(10);
    expect(getDailyAiQueryLimit(true)).toBe(15);
  });

  it("uses Istanbul midnight as the daily reset boundary", () => {
    expect(getIstanbulAiQueryWindow(new Date("2026-07-27T20:59:59.999Z"))).toEqual({
      dayKey: "2026-07-27",
      resetAt: "2026-07-27T21:00:00.000Z",
    });
    expect(getIstanbulAiQueryWindow(new Date("2026-07-27T21:00:00.000Z"))).toEqual({
      dayKey: "2026-07-28",
      resetAt: "2026-07-28T21:00:00.000Z",
    });
  });

  it("reports remaining allowance without going below zero", () => {
    expect(buildAiQueryQuota({
      used: 3,
      isPaidVipActive: false,
      resetAt: "2026-07-27T21:00:00.000Z",
    })).toMatchObject({ limit: 10, used: 3, remaining: 7 });

    expect(buildAiQueryQuota({
      used: 16,
      isPaidVipActive: true,
      resetAt: "2026-07-27T21:00:00.000Z",
    })).toMatchObject({ limit: 15, used: 16, remaining: 0 });
  });
});
