import { describe, expect, it, vi } from "vitest";

import {
  buildMysqlArguments,
  interpolateSql,
  mysqlLiteral,
  parseMysqlBatch,
  queryMysqlWithRetry,
} from "./mysql-cli.mjs";
import { buildMysqlHexSelectExpression } from "./sqlite-to-mysql-etl.mjs";

describe("MySQL operations CLI", () => {
  const readOnlyFrame = "__enbilir_cli_frame__\ncomplete\n";

  it("keeps credentials out of process arguments", () => {
    const args = buildMysqlArguments({
      defaultsFile: "/synthetic/mysql.cnf",
      database: "enbilir_synthetic",
    });

    expect(args).toContain("--defaults-extra-file=/synthetic/mysql.cnf");
    expect(args).toContain("--database=enbilir_synthetic");
    expect(args).toContain("--column-names");
    expect(args.join(" ")).not.toMatch(/password|secret-value/i);
  });

  it("supports a named local login path without exposing credentials", () => {
    const args = buildMysqlArguments({
      loginPath: "enbilir-local",
      database: "enbilir",
    });

    expect(args).toContain("--login-path=enbilir-local");
    expect(args).toContain("--database=enbilir");
    expect(args.join(" ")).not.toMatch(/password|secret-value/i);
  });

  it("requires exactly one credential source", () => {
    expect(() => buildMysqlArguments({ database: "enbilir" })).toThrow(/exactly one/i);
    expect(() => buildMysqlArguments({
      defaultsFile: "/synthetic/mysql.cnf",
      loginPath: "enbilir-local",
      database: "enbilir",
    })).toThrow(/exactly one/i);
  });

  it("renders parameters without losing UTC milliseconds", () => {
    const timestamp = new Date("2026-08-04T07:08:09.123Z");

    expect(mysqlLiteral(timestamp)).toBe("'2026-08-04 07:08:09.123'");
    expect(interpolateSql("VALUES (?, ?, ?)", ["O'Reilly", true, timestamp])).toBe(
      "VALUES ('O''Reilly', 1, '2026-08-04 07:08:09.123')",
    );
  });

  it("parses escaped batch results without logging them", () => {
    expect(parseMysqlBatch("id\tnote\nsynthetic\tline\\nvalue\n")).toEqual([
      { id: "synthetic", note: "line\nvalue" },
    ]);
  });

  it("retries a read-only query when successful mysql exits return truly empty stdout", () => {
    const outputs = ["", "rowCount\r\n42\r\n__enbilir_cli_frame__\r\ncomplete\r\n"];
    const execute = vi.fn(() => ({ stdout: outputs.shift() ?? "" }));
    const wait = vi.fn();

    expect(queryMysqlWithRetry({ sql: "SELECT COUNT(*) AS rowCount FROM `Fixture`", execute, wait })).toEqual([
      { rowCount: "42" },
    ]);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(50);
  });

  it("fails privately after bounded repeated empty read-only results", () => {
    const execute = vi.fn(() => ({ stdout: "" }));
    const wait = vi.fn();

    expect(() => queryMysqlWithRetry({ sql: "SELECT id FROM `SyntheticFixture`", execute, wait }))
      .toThrow("MySQL read-only query returned empty output after 6 attempts; query details were withheld.");
    expect(execute).toHaveBeenCalledTimes(6);
    expect(wait.mock.calls.map(([delay]) => delay)).toEqual([50, 100, 200, 400, 800]);
  });

  it("retries non-empty read-only output that lacks the final newline frame", () => {
    const outputs = ["rowCount\n4", `rowCount\n42\n${readOnlyFrame}`];
    const execute = vi.fn(() => ({ stdout: outputs.shift() ?? "" }));
    const wait = vi.fn();

    expect(queryMysqlWithRetry({ sql: "SELECT COUNT(*) AS rowCount FROM `Fixture`", execute, wait })).toEqual([
      { rowCount: "42" },
    ]);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(50);
  });

  it("retries the ETL readback SELECT containing CHARACTER SET casts", () => {
    const sql = `SELECT ${buildMysqlHexSelectExpression("payload", { dataType: "json" })} FROM \`Fixture\``;
    const outputs = ["", "payload\r\nH7b7d\r\n__enbilir_cli_frame__\r\ncomplete\r\n"];
    const execute = vi.fn(() => ({ stdout: outputs.shift() ?? "" }));
    const wait = vi.fn();

    expect(queryMysqlWithRetry({ sql, execute, wait })).toEqual([{ payload: "H7b7d" }]);
    expect(execute).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledWith(50);
  });

  it("does not retry a header-only zero-row result", () => {
    const execute = vi.fn(() => ({ stdout: `id\n${readOnlyFrame}` }));

    expect(queryMysqlWithRetry({ sql: "SELECT id FROM `Fixture` WHERE 1 = 0", execute })).toEqual([]);
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it("never retries a mutating statement followed by SELECT ROW_COUNT", () => {
    for (const stdout of ["", "changes\n1"]) {
      const execute = vi.fn(() => ({ stdout }));
      expect(() => queryMysqlWithRetry({
        sql: "UPDATE `Fixture` SET `status` = 'done'; SELECT ROW_COUNT() AS changes",
        execute,
      })).toThrow(/retry was suppressed because the statement was not provably read-only/);
      expect(execute).toHaveBeenCalledTimes(1);
    }
  });

  it.each([
    "UPDATE `Fixture` SET `status` = 'done'",
    "INSERT INTO `Fixture` (`status`) VALUES ('done')",
    "SELECT 1; UPDATE `Fixture` SET `status` = 'done'",
    "WITH synthetic AS (SELECT 1) SELECT * FROM synthetic",
  ])("never retries SQL outside the proven single-SELECT subset: %s", (sql) => {
    const execute = vi.fn(() => ({ stdout: "" }));

    expect(() => queryMysqlWithRetry({ sql, execute })).toThrow(/retry was suppressed/);
    expect(execute).toHaveBeenCalledTimes(1);
  });
});
