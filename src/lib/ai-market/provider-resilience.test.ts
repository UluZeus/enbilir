import { describe, expect, it, vi } from "vitest";
import {
  ProviderRequestBudget,
  mapSettledWithConcurrency,
  withProviderRetry,
} from "@/lib/ai-market/provider-resilience";

describe("provider resilience", () => {
  it("retries transient failures with a bounded delay", async () => {
    const operation = vi.fn()
      .mockRejectedValueOnce(new Error("JSON request failed (429)"))
      .mockResolvedValue("ok");
    const sleep = vi.fn().mockResolvedValue(undefined);

    await expect(withProviderRetry(operation, {
      maxAttempts: 2,
      baseDelayMs: 100,
      random: () => 0.5,
      sleep,
    })).resolves.toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledOnce();
    expect(sleep).toHaveBeenCalledWith(100);
  });

  it("does not retry non-transient response-shape errors", async () => {
    const operation = vi.fn().mockRejectedValue(new Error("Unexpected provider payload"));

    await expect(withProviderRetry(operation, { maxAttempts: 3 })).rejects.toThrow("Unexpected provider payload");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("limits concurrency and keeps settled results in input order", async () => {
    let active = 0;
    let peak = 0;
    const results = await mapSettledWithConcurrency([1, 2, 3, 4], 2, async (value) => {
      active += 1;
      peak = Math.max(peak, active);
      await new Promise((resolve) => setTimeout(resolve, value % 2 === 0 ? 1 : 4));
      active -= 1;
      return value * 10;
    });

    expect(peak).toBeLessThanOrEqual(2);
    expect(results.map((result) => result.status === "fulfilled" ? result.value : null)).toEqual([10, 20, 30, 40]);
  });

  it("enforces a hard request budget", () => {
    const budget = new ProviderRequestBudget(2);
    expect(budget.consume()).toBe(1);
    expect(budget.consume()).toBe(0);
    expect(() => budget.consume()).toThrow("Provider request budget exceeded");
  });
});
