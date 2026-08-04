import { spawnSync } from "node:child_process";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { canUseDisposableMysql, createDisposableMysqlDatabase } from "../../scripts/lib/disposable-mysql.mjs";
import { MysqlCliDatabase } from "../../scripts/lib/mysql-cli.mjs";

const describeMysql = canUseDisposableMysql() ? describe : describe.skip;
let disposable: ReturnType<typeof createDisposableMysqlDatabase>;
let database: MysqlCliDatabase;

function deploySchema() {
  const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    cwd: process.cwd(),
    env: { ...process.env, ENBILIR_ENV: "test", DATABASE_URL: disposable.databaseUrl },
    encoding: "utf8",
    stdio: "pipe",
  });
  if (result.status !== 0) throw new Error("Disposable MySQL migration failed; provider output was withheld.");
}

describeMysql("release gate: disposable MySQL financial constraints", () => {
  beforeAll(() => {
    disposable = createDisposableMysqlDatabase({ purpose: "test" });
    deploySchema();
    database = new MysqlCliDatabase({ defaultsFile: disposable.defaultsFile, database: disposable.database });
    const timestamp = new Date("2026-07-28T12:00:00.000Z");
    database.prepare(`
      INSERT INTO \`User\` (id, name, email, isActive, emailVerifiedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `).run("user-release-gate", "Release Gate", "release-gate@enbilir.invalid", timestamp, timestamp, timestamp);
  }, 120_000);

  afterAll(() => disposable?.drop());

  it("enforces durable per-user trade idempotency", () => {
    const insert = database.prepare(`
      INSERT INTO \`VirtualTrade\` (
        id, userId, idempotencyKey, symbol, name, market, side, quantity, priceUsd, totalUsd,
        requestedAmountUsd, executionNotionalUsd, feeUsd, slippageUsd, priceSource, createdAt
      ) VALUES (?, ?, ?, 'AAPL', 'Apple', 'NASDAQ', 'BUY', 1, 100, 100, 100, 99.99, 0.01, 0.02, 'synthetic', ?)
    `);
    const timestamp = new Date("2026-07-28T12:00:00.000Z");
    expect(insert.run("trade-release-1", "user-release-gate", "release-key-1", timestamp).changes).toBe(1);
    expect(() => insert.run("trade-release-2", "user-release-gate", "release-key-1", timestamp)).toThrow();
    const row = database.prepare("SELECT COUNT(*) AS count FROM `VirtualTrade` WHERE userId = ? AND idempotencyKey = ?")
      .get("user-release-gate", "release-key-1");
    expect(Number(row.count)).toBe(1);
  });

  it("enforces one atomic daily quota counter per user and Istanbul day", () => {
    const insert = database.prepare(`
      INSERT INTO \`AiDailyQueryUsage\` (id, userId, dayKey, queryCount, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const timestamp = new Date("2026-07-28T12:00:00.000Z");
    expect(insert.run("usage-release-1", "user-release-gate", "2026-07-28", 5, timestamp, timestamp).changes).toBe(1);
    expect(() => insert.run("usage-release-2", "user-release-gate", "2026-07-28", 1, timestamp, timestamp)).toThrow();
  });
});
