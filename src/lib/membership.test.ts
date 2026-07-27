import { describe, expect, it } from "vitest";
import { getMembershipSnapshot } from "@/lib/membership";

const now = new Date("2026-07-27T12:00:00.000Z");
const createdAt = new Date("2026-01-01T00:00:00.000Z");

describe("promotional full VIP access", () => {
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
