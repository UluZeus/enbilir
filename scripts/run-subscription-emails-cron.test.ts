import { spawnSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("subscription reminder cron CLI", () => {
  it("rejects the removed --test-email option before making a request", () => {
    const result = spawnSync(
      process.execPath,
      [
        path.join(process.cwd(), "scripts", "run-subscription-emails-cron.mjs"),
        "--test-email=arbitrary@example.test",
      ],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          SUBSCRIPTION_CRON_SECRET: "synthetic-secret",
        },
      },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toContain("--test-email is not supported");
    expect(result.stdout).not.toContain("arbitrary@example.test");
  });
});
