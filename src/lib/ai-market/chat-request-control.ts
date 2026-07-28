export const OPENAI_REQUEST_BUDGET_MS = {
  STANDARD: 35_000,
  VIP: 50_000,
} as const;

type OpenAiRequestTier = keyof typeof OPENAI_REQUEST_BUDGET_MS;

export function createOpenAiRequestBudget(
  tier: OpenAiRequestTier,
  startedAt = Date.now(),
) {
  const deadlineAt = startedAt + OPENAI_REQUEST_BUDGET_MS[tier];

  return {
    deadlineAt,
    remainingMs(now = Date.now()) {
      return Math.max(0, deadlineAt - now);
    },
  };
}
