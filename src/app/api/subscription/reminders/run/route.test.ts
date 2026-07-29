import { beforeEach, describe, expect, it, vi } from "vitest";

const reminderMocks = vi.hoisted(() => ({
  authorized: vi.fn(),
  runJob: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  },
}));
vi.mock("@/lib/cron-auth", () => ({
  isCronRequestAuthorized: reminderMocks.authorized,
}));
vi.mock("@/lib/subscription-emails", () => ({
  runSubscriptionEmailJob: reminderMocks.runJob,
}));

import { POST } from "./route";

describe("subscription reminder cron route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reminderMocks.authorized.mockReturnValue(true);
    reminderMocks.runJob.mockResolvedValue({
      dryRun: false,
      testMode: false,
      sent: 0,
      due: 0,
      failed: 0,
      results: [],
    });
  });

  it("ignores arbitrary testEmail query input and never forwards a recipient", async () => {
    const response = await POST(new Request(
      "https://enbilir.test/api/subscription/reminders/run?testEmail=attacker%40example.test&limit=5",
      {
        method: "POST",
        headers: { "x-subscription-cron-secret": "synthetic" },
      },
    ));

    expect(response.status).toBe(200);
    expect(reminderMocks.runJob).toHaveBeenCalledWith({
      now: expect.any(Date),
      dryRun: false,
      limit: 5,
    });
    expect(reminderMocks.runJob.mock.calls[0][0]).not.toHaveProperty("testEmail");
    await expect(response.text()).resolves.not.toContain("attacker@example.test");
  });
});
