import { describe, expect, it } from "vitest";

import {
  buildMysqlArguments,
  interpolateSql,
  mysqlLiteral,
  parseMysqlBatch,
} from "./mysql-cli.mjs";

describe("MySQL operations CLI", () => {
  it("keeps credentials out of process arguments", () => {
    const args = buildMysqlArguments({
      defaultsFile: "/synthetic/mysql.cnf",
      database: "enbilir_synthetic",
    });

    expect(args).toContain("--defaults-extra-file=/synthetic/mysql.cnf");
    expect(args).toContain("--database=enbilir_synthetic");
    expect(args.join(" ")).not.toMatch(/password|secret-value/i);
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
});
