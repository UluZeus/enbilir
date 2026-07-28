type RetryOptions = {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  random?: () => number;
  sleep?: (milliseconds: number) => Promise<void>;
  shouldRetry?: (error: unknown) => boolean;
};

const transientErrorPattern = /\b(408|425|429|500|502|503|504)\b|abort|network|fetch failed|socket|timed?\s*out|timeout/i;

function defaultShouldRetry(error: unknown) {
  return error instanceof Error && transientErrorPattern.test(error.message);
}

function defaultSleep(milliseconds: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export async function withProviderRetry<T>(
  operation: (attempt: number) => Promise<T>,
  options: RetryOptions = {},
) {
  const maxAttempts = Math.max(1, Math.min(3, Math.trunc(options.maxAttempts ?? 2)));
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 150);
  const maxDelayMs = Math.max(baseDelayMs, options.maxDelayMs ?? 1_000);
  const random = options.random ?? Math.random;
  const sleep = options.sleep ?? defaultSleep;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation(attempt);
    } catch (error) {
      if (attempt >= maxAttempts || !shouldRetry(error)) {
        throw error;
      }

      const exponentialDelay = Math.min(maxDelayMs, baseDelayMs * (2 ** (attempt - 1)));
      const jitterMultiplier = 0.75 + Math.max(0, Math.min(1, random())) * 0.5;
      await sleep(Math.round(exponentialDelay * jitterMultiplier));
    }
  }

  throw new Error("Provider retry loop exited unexpectedly");
}

export class ProviderRequestBudget {
  private remainingRequests: number;

  constructor(maxRequests: number) {
    this.remainingRequests = Math.max(0, Math.trunc(maxRequests));
  }

  consume() {
    if (this.remainingRequests <= 0) {
      throw new Error("Provider request budget exceeded");
    }

    this.remainingRequests -= 1;
    return this.remainingRequests;
  }

  get remaining() {
    return this.remainingRequests;
  }
}

export async function mapSettledWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  if (items.length === 0) {
    return [];
  }

  const results = new Array<PromiseSettledResult<R>>(items.length);
  const workerCount = Math.max(1, Math.min(items.length, Math.trunc(concurrency) || 1));
  let nextIndex = 0;

  async function runWorker() {
    while (true) {
      const index = nextIndex;
      nextIndex += 1;

      if (index >= items.length) {
        return;
      }

      try {
        results[index] = {
          status: "fulfilled",
          value: await worker(items[index], index),
        };
      } catch (reason) {
        results[index] = {
          status: "rejected",
          reason,
        };
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
  return results;
}
