import { describe, expect, it } from "vitest";
import {
  createOpenAiRequestBudget,
  OPENAI_REQUEST_BUDGET_MS,
} from "@/lib/ai-market/chat-request-control";

describe("AI market chat request control", () => {
  it("shares one VIP deadline across both attempts instead of resetting the timeout", () => {
    const startedAt = 10_000;
    const budget = createOpenAiRequestBudget("VIP", startedAt);

    expect(budget.remainingMs(startedAt)).toBe(OPENAI_REQUEST_BUDGET_MS.VIP);
    expect(budget.remainingMs(startedAt + 35_000)).toBe(
      OPENAI_REQUEST_BUDGET_MS.VIP - 35_000,
    );
    expect(budget.remainingMs(startedAt + OPENAI_REQUEST_BUDGET_MS.VIP)).toBe(0);
  });

  it("keeps the controlled fallback deadline below the upstream proxy window", () => {
    expect(OPENAI_REQUEST_BUDGET_MS.VIP).toBeLessThanOrEqual(50_000);
    expect(OPENAI_REQUEST_BUDGET_MS.STANDARD).toBeLessThan(
      OPENAI_REQUEST_BUDGET_MS.VIP,
    );
  });
});
