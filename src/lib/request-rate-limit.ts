import { isIP } from "node:net";

type RateLimitBucket = {
  count: number;
  resetAt: number;
};

type FixedWindowRateLimiterOptions = {
  windowMs: number;
  maxRequests: number;
  maxEntries: number;
};

const localClientKey = "local";

function normalizeIp(value: string | null) {
  const candidate = value?.trim() ?? "";
  return isIP(candidate) ? candidate : null;
}

export function getRateLimitClientKey(headers: Headers) {
  const realIp = normalizeIp(headers.get("x-real-ip"));

  if (realIp) {
    return realIp;
  }

  const forwardedFor = headers.get("x-forwarded-for")
    ?.split(",")
    .map((entry) => normalizeIp(entry))
    .filter((entry): entry is string => Boolean(entry));

  return forwardedFor?.at(-1) ?? localClientKey;
}

export class FixedWindowRateLimiter {
  readonly #windowMs: number;
  readonly #maxRequests: number;
  readonly #maxEntries: number;
  readonly #buckets = new Map<string, RateLimitBucket>();

  constructor({ windowMs, maxRequests, maxEntries }: FixedWindowRateLimiterOptions) {
    if (!Number.isFinite(windowMs) || windowMs <= 0) {
      throw new RangeError("windowMs must be greater than zero");
    }

    if (!Number.isInteger(maxRequests) || maxRequests <= 0) {
      throw new RangeError("maxRequests must be a positive integer");
    }

    if (!Number.isInteger(maxEntries) || maxEntries <= 0) {
      throw new RangeError("maxEntries must be a positive integer");
    }

    this.#windowMs = windowMs;
    this.#maxRequests = maxRequests;
    this.#maxEntries = maxEntries;
  }

  get size() {
    return this.#buckets.size;
  }

  isRateLimited(key: string, now = Date.now()) {
    this.#deleteExpired(now);
    const bucket = this.#buckets.get(key);

    if (bucket) {
      bucket.count += 1;
      return bucket.count > this.#maxRequests;
    }

    while (this.#buckets.size >= this.#maxEntries) {
      const oldestKey = this.#buckets.keys().next().value;

      if (typeof oldestKey !== "string") {
        break;
      }

      this.#buckets.delete(oldestKey);
    }

    this.#buckets.set(key, { count: 1, resetAt: now + this.#windowMs });
    return false;
  }

  #deleteExpired(now: number) {
    for (const [key, bucket] of this.#buckets) {
      if (bucket.resetAt <= now) {
        this.#buckets.delete(key);
      }
    }
  }
}
