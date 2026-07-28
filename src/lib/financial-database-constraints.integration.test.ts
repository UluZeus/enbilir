import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const testDirectory = mkdtempSync(path.join(tmpdir(), "enbilir-financial-constraints-"));
const databasePath = path.join(testDirectory, "release-gate.db");
let database: Database.Database;

beforeAll(() => {
  database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  const migrationsRoot = path.join(process.cwd(), "prisma", "migrations");
  for (const directory of readdirSync(migrationsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()) {
    database.exec(readFileSync(path.join(migrationsRoot, directory, "migration.sql"), "utf8"));
  }
  const timestamp = "2026-07-28T12:00:00.000Z";
  database.prepare(`
    INSERT INTO "User" ("id", "name", "email", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
    VALUES (?, ?, ?, 1, ?, ?, ?)
  `).run("user-release-gate", "Release Gate", "release-gate@example.test", timestamp, timestamp, timestamp);
});

afterAll(() => {
  database?.close();
  rmSync(testDirectory, { recursive: true, force: true });
});

describe("release gate: disposable financial database constraints", () => {
  it("enforces durable per-user trade idempotency", () => {
    const insert = database.prepare(`
      INSERT INTO "VirtualTrade" (
        "id", "userId", "idempotencyKey", "symbol", "name", "market", "side",
        "quantity", "priceUsd", "totalUsd", "requestedAmountUsd",
        "executionNotionalUsd", "feeUsd", "slippageUsd", "priceSource", "createdAt"
      ) VALUES (
        @id, @userId, @idempotencyKey, 'AAPL', 'Apple', 'NASDAQ', 'BUY',
        1, 100, 100, 100, 99.99, 0.01, 0.02, 'yahoo', @createdAt
      )
    `);
    const row = {
      id: "trade-release-1",
      userId: "user-release-gate",
      idempotencyKey: "release-key-1",
      createdAt: "2026-07-28T12:00:00.000Z",
    };

    expect(insert.run(row).changes).toBe(1);
    expect(() => insert.run({ ...row, id: "trade-release-2" })).toThrow(/UNIQUE constraint failed/);
    expect(database.prepare(`
      SELECT COUNT(*) AS count
      FROM "VirtualTrade"
      WHERE "userId" = ? AND "idempotencyKey" = ?
    `).get(row.userId, row.idempotencyKey)).toEqual({ count: 1 });
  });

  it("enforces one atomic daily quota counter per user and Istanbul day", () => {
    const insert = database.prepare(`
      INSERT INTO "AiDailyQueryUsage" ("id", "userId", "dayKey", "queryCount", "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const timestamp = "2026-07-28T12:00:00.000Z";

    expect(insert.run(
      "usage-release-1",
      "user-release-gate",
      "2026-07-28",
      5,
      timestamp,
      timestamp,
    ).changes).toBe(1);
    expect(() => insert.run(
      "usage-release-2",
      "user-release-gate",
      "2026-07-28",
      1,
      timestamp,
      timestamp,
    )).toThrow(/UNIQUE constraint failed/);
  });
});
