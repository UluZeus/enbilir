import { describe, expect, it } from "vitest";

import { parseRunWithHeartbeatArguments } from "../../../scripts/lib/run-with-heartbeat-arguments.mjs";

describe("run-with-heartbeat argument parsing", () => {
  it("starts the child command after the separator instead of trying to execute the separator", () => {
    expect(
      parseRunWithHeartbeatArguments([
        "--job",
        "ai-agent",
        "--log-dir",
        "/var/log/enbilir",
        "--",
        "node",
        "scripts/run-ai-agent-cron.mjs",
        "--force",
      ]),
    ).toEqual({
      jobKey: "ai-agent",
      logDirectory: "/var/log/enbilir",
      maxBytes: 10 * 1024 * 1024,
      command: "node",
      commandArguments: ["scripts/run-ai-agent-cron.mjs", "--force"],
    });
  });

  it("fails closed for missing commands, unknown options, and invalid byte limits", () => {
    expect(() => parseRunWithHeartbeatArguments(["--job", "backup", "--"])).toThrow(/Usage/);
    expect(() =>
      parseRunWithHeartbeatArguments(["--job", "backup", "--unexpected", "value", "--", "node"]),
    ).toThrow(/Invalid/);
    expect(() =>
      parseRunWithHeartbeatArguments(["--job", "backup", "--job", "cleanup", "--", "node"]),
    ).toThrow(/Invalid/);
    expect(() =>
      parseRunWithHeartbeatArguments(["--job", "backup", "--max-bytes", "NaN", "--", "node"]),
    ).toThrow(/positive safe integer/);
  });
});
