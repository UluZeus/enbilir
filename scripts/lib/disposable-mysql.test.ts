import { describe, expect, it } from "vitest";

import { deriveDisposableDatabaseUrl, resolveDisposableMysqlOptions } from "./disposable-mysql.mjs";

describe("disposable MySQL safety policy", () => {
  it("requires an explicit opt-in and test-only database URL", () => {
    expect(() => resolveDisposableMysqlOptions({
      NODE_ENV: "test",
      MYSQL_TEST_DATABASE_URL: "mysql://synthetic:synthetic@localhost/mysql",
    })).toThrow(/MYSQL_ALLOW_DISPOSABLE_DATABASES/);
  });

  it("refuses production runtime even when opted in", () => {
    expect(() => resolveDisposableMysqlOptions({
      NODE_ENV: "production",
      ENBILIR_ENV: "production",
      MYSQL_ALLOW_DISPOSABLE_DATABASES: "1",
      MYSQL_TEST_DATABASE_URL: "mysql://synthetic:synthetic@localhost/mysql",
      MYSQL_DEFAULTS_FILE: "C:\\synthetic\\mysql.cnf",
    })).toThrow(/production/i);
  });

  it("changes only the database path and never exposes the URL through arguments", () => {
    expect(deriveDisposableDatabaseUrl(
      "mysql://synthetic:secret@mysql.invalid:3306/bootstrap?connection_limit=2",
      "_enbilir_test_123",
    )).toBe("mysql://synthetic:secret@mysql.invalid:3306/_enbilir_test_123?connection_limit=2");
  });
});
