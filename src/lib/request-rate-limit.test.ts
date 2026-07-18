import { describe, expect, it } from "vitest";
import { FixedWindowRateLimiter, getRateLimitClientKey } from "@/lib/request-rate-limit";

describe("request rate limiting", () => {
  it("prefers a valid X-Real-IP over attacker-controlled forwarded values", () => {
    const headers = new Headers({
      "x-real-ip": "198.51.100.42",
      "x-forwarded-for": "203.0.113.7, 192.0.2.10",
    });

    expect(getRateLimitClientKey(headers)).toBe("198.51.100.42");
  });

  it("uses the last valid forwarded IP so changing the spoofed first value cannot bypass the limit", () => {
    const limiter = new FixedWindowRateLimiter({ windowMs: 60_000, maxRequests: 2, maxEntries: 20 });
    const trustedProxyAppendedIp = "198.51.100.88";
    const keys = ["203.0.113.1", "203.0.113.2", "203.0.113.3"].map((spoofedIp) => getRateLimitClientKey(new Headers({
      "x-forwarded-for": `${spoofedIp}, ${trustedProxyAppendedIp}`,
    })));

    expect(new Set(keys)).toEqual(new Set([trustedProxyAppendedIp]));
    expect(limiter.isRateLimited(keys[0], 1_000)).toBe(false);
    expect(limiter.isRateLimited(keys[1], 1_001)).toBe(false);
    expect(limiter.isRateLimited(keys[2], 1_002)).toBe(true);
  });

  it("uses a stable local fallback when no valid client header exists", () => {
    expect(getRateLimitClientKey(new Headers())).toBe("local");
    expect(getRateLimitClientKey(new Headers({
      "x-real-ip": "not-an-ip",
      "x-forwarded-for": "unknown, also-invalid",
    }))).toBe("local");
  });

  it("removes expired buckets and resets their request window", () => {
    const limiter = new FixedWindowRateLimiter({ windowMs: 100, maxRequests: 1, maxEntries: 4 });

    expect(limiter.isRateLimited("client-a", 1_000)).toBe(false);
    expect(limiter.isRateLimited("client-a", 1_050)).toBe(true);
    expect(limiter.isRateLimited("client-b", 1_101)).toBe(false);
    expect(limiter.size).toBe(1);
    expect(limiter.isRateLimited("client-a", 1_102)).toBe(false);
  });

  it("never grows beyond its configured entry bound", () => {
    const limiter = new FixedWindowRateLimiter({ windowMs: 60_000, maxRequests: 1, maxEntries: 3 });

    for (let index = 0; index < 20; index += 1) {
      expect(limiter.isRateLimited(`client-${index}`, 1_000 + index)).toBe(false);
      expect(limiter.size).toBeLessThanOrEqual(3);
    }

    expect(limiter.size).toBe(3);
  });
});
