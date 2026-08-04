import { describe, expect, it, vi } from "vitest";

import { buildProvisionSql, runLocalMysqlWrapper } from "./run-with-local-mysql.mjs";

describe("local mysql login-path wrapper", () => {
  it("keeps generated credentials in stdin and temporary environment, never arguments", () => {
    const calls: Array<{ command: string; args: string[]; options: Record<string, unknown> }> = [];
    const spawn = vi.fn((command: string, args: string[], options: Record<string, unknown>) => {
      calls.push({ command, args, options });
      return { status: 0 };
    });
    const spawnSyncOperation = spawn as unknown as typeof import("node:child_process").spawnSync;

    expect(runLocalMysqlWrapper({
      argv: ["--", "node", "synthetic-child.mjs"],
      env: { NODE_ENV: "test", MYSQL_ADMIN_LOGIN_PATH: "synthetic-login" },
      spawnSyncOperation,
    })).toBe(0);

    expect(calls).toHaveLength(3);
    expect(calls[0].args).toContain("--login-path=synthetic-login");
    expect(calls[1].command).toBe("node");
    expect(calls[1].options.env).toEqual(expect.objectContaining({
      MYSQL_ALLOW_DISPOSABLE_DATABASES: "1",
      ENBILIR_ENV: "test",
    }));
    const provisionSql = String(calls[0].options.input);
    const password = provisionSql.match(/IDENTIFIED BY '([^']+)'/)?.[1];
    expect(password).toBeTruthy();
    expect(calls.flatMap((call) => call.args).join(" ")).not.toContain(password);
  });

  it("uses only the constrained disposable database grant", () => {
    expect(buildProvisionSql("enbilir_test_1234", "localhost", "synthetic-password-value-1234567890"))
      .toContain("ON `\\_enbilir\\_%`.*");
  });

  it("refuses production", () => {
    expect(() => runLocalMysqlWrapper({
      argv: ["--", "node", "synthetic-child.mjs"],
      env: { NODE_ENV: "production", ENBILIR_ENV: "production" },
      spawnSyncOperation: vi.fn(),
    })).toThrow(/production/i);
  });
});
