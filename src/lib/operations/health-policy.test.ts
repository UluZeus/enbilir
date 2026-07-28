import { describe, expect, it } from "vitest";

import { evaluateHeartbeatFreshness, getMissingMigrations } from "@/lib/operations/health-policy";

describe("operations health policy", () => {
  it("detects missing and failed migrations", () => {
    expect(
      getMissingMigrations(
        ["001_initial", "002_hardening"],
        [
          { migrationName: "001_initial", finishedAt: new Date(), rolledBackAt: null },
          { migrationName: "002_hardening", finishedAt: null, rolledBackAt: null },
        ],
      ),
    ).toEqual(["002_hardening"]);
  });

  it("fails closed for absent, failed, or stale required jobs", () => {
    const now = new Date("2026-07-28T12:00:00.000Z");

    expect(evaluateHeartbeatFreshness(undefined, 120, now).status).toBe("fail");
    expect(
      evaluateHeartbeatFreshness(
        {
          lastSucceededAt: new Date("2026-07-28T11:00:00.000Z"),
          lastFailedAt: new Date("2026-07-28T11:30:00.000Z"),
        },
        120,
        now,
      ).status,
    ).toBe("fail");
    expect(
      evaluateHeartbeatFreshness(
        {
          lastSucceededAt: new Date("2026-07-28T08:00:00.000Z"),
          lastFailedAt: null,
        },
        120,
        now,
      ).status,
    ).toBe("fail");
  });

  it("accepts a recent successful heartbeat", () => {
    const result = evaluateHeartbeatFreshness(
      {
        lastSucceededAt: new Date("2026-07-28T11:15:00.000Z"),
        lastFailedAt: new Date("2026-07-28T10:00:00.000Z"),
      },
      120,
      new Date("2026-07-28T12:00:00.000Z"),
    );

    expect(result.status).toBe("pass");
  });
});
