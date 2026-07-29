import { describe, expect, it } from "vitest";
import { getMembershipLabel, getMembershipSnapshot, membershipConfig } from "@/lib/membership";

const now = new Date("2026-07-27T12:00:00.000Z");
const createdAt = new Date("2026-01-01T00:00:00.000Z");

describe("promotional full VIP access", () => {
  it("has a single 100 TL paid plan and a 10/15 daily AI allowance", () => {
    expect(membershipConfig).toMatchObject({
      vipMonthlyAmountTry: 100,
      freeDailyAiQueryLimit: 10,
      paidVipDailyAiQueryLimit: 15,
    });
    expect(membershipConfig).not.toHaveProperty("standardMonthlyAmountTry");
    expect(membershipConfig).not.toHaveProperty("standardPaymentLink");
    expect(membershipConfig).not.toHaveProperty("vipPaymentLink");
  });

  it("labels legacy STANDARD storage as the Free billing plan", () => {
    expect(getMembershipLabel("STANDARD", "tr")).toBe("Ücretsiz");
    expect(getMembershipLabel("STANDARD", "en")).toBe("Free");
    expect(getMembershipLabel("VIP", "tr")).toBe("VIP destekçi");
    expect(getMembershipLabel("VIP", "en")).toBe("VIP supporter");
  });

  it("gives a standard member full VIP product access without marking the member as paid", () => {
    const membership = getMembershipSnapshot({
      createdAt,
      membershipTier: "STANDARD",
      vipPaidUntil: null,
    }, now);

    expect(membership.effectiveTier).toBe("VIP");
    expect(membership.isVipActive).toBe(true);
    expect(membership.hasPromotionalVipAccess).toBe(true);
    expect(membership.isPaidVipActive).toBe(false);
  });

  it("keeps an active 100 TL VIP payment distinguishable for the higher query allowance", () => {
    const membership = getMembershipSnapshot({
      createdAt,
      membershipTier: "VIP",
      vipPaidUntil: new Date("2026-08-27T12:00:00.000Z"),
    }, now);

    expect(membership.effectiveTier).toBe("VIP");
    expect(membership.isVipActive).toBe(true);
    expect(membership.isPaidVipActive).toBe(true);
  });

  it("does not treat an expired VIP payment as paid", () => {
    const membership = getMembershipSnapshot({
      createdAt,
      membershipTier: "VIP",
      vipPaidUntil: new Date("2026-07-26T12:00:00.000Z"),
    }, now);

    expect(membership.isVipActive).toBe(true);
    expect(membership.isPaidVipActive).toBe(false);
  });
});
