import { describe, expect, it } from "vitest";
import {
  canonicalizeVipPaymentReference,
  isValidVipPaymentReference,
  liveVipSubscriptionClaimStatuses,
  normalizeVipPaymentReference,
} from "./vip-subscription-claim-policy";

describe("VIP payment claim references", () => {
  it("normalizes human-entered Param receipt references", () => {
    expect(normalizeVipPaymentReference("  1234 5678 ")).toBe("12345678");
    expect(normalizeVipPaymentReference("param:abc-123")).toBe("ABC-123");
    expect(canonicalizeVipPaymentReference("abc-123")).toBe("PARAM:ABC-123");
    expect(isValidVipPaymentReference("PARAM-2026/1234")).toBe(true);
  });

  it("rejects short or executable-looking values", () => {
    expect(isValidVipPaymentReference("123")).toBe(false);
    expect(isValidVipPaymentReference("<script>alert(1)</script>")).toBe(false);
    expect(isValidVipPaymentReference("receipt 1234")).toBe(false);
  });

  it("allows rejected attempts to be retried while reusing live claims", () => {
    const liveStatuses = new Set<string>(liveVipSubscriptionClaimStatuses);

    expect(liveStatuses.has("PENDING")).toBe(true);
    expect(liveStatuses.has("APPROVED")).toBe(true);
    expect(liveStatuses.has("REJECTED")).toBe(false);
  });
});
