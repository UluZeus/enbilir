import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const testDirectory = mkdtempSync(path.join(tmpdir(), "enbilir-support-reminder-"));
const databasePath = path.join(testDirectory, "support-reminder.db");
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
  const timestamp = "2026-07-29T12:00:00.000Z";
  database.prepare(`
    INSERT INTO "User" ("id", "name", "email", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
    VALUES (?, ?, ?, 1, ?, ?, ?)
  `).run("user-support", "Support Fixture", "support@example.test", timestamp, timestamp, timestamp);
});

afterAll(() => {
  database?.close();
  rmSync(testDirectory, { recursive: true, force: true });
});

describe("support reminder database constraints", () => {
  it("enforces one period per account and one entry token per account period", () => {
    const timestamp = "2026-07-29T12:00:00.000Z";
    database.prepare(`
      INSERT INTO "SupportReminderPeriod"
        ("id", "userId", "periodKey", "onsitePromptCount", "createdAt", "updatedAt")
      VALUES (?, ?, ?, 0, ?, ?)
    `).run("period-1", "user-support", "2026-07", timestamp, timestamp);

    expect(() => database.prepare(`
      INSERT INTO "SupportReminderPeriod"
        ("id", "userId", "periodKey", "onsitePromptCount", "createdAt", "updatedAt")
      VALUES (?, ?, ?, 0, ?, ?)
    `).run("period-2", "user-support", "2026-07", timestamp, timestamp)).toThrow(/UNIQUE constraint failed/);

    const insertEntry = database.prepare(`
      INSERT INTO "SupportReminderEntry"
        ("id", "userId", "periodId", "entryTokenHash", "createdAt")
      VALUES (?, ?, ?, ?, ?)
    `);
    insertEntry.run("entry-1", "user-support", "period-1", "a".repeat(64), timestamp);
    expect(() => insertEntry.run(
      "entry-2",
      "user-support",
      "period-1",
      "a".repeat(64),
      timestamp,
    )).toThrow(/UNIQUE constraint failed/);
  });

  it("allows only one live claim owner for a canonical Param reference and releases rejected references", () => {
    const timestamp = "2026-07-29T12:00:00.000Z";
    database.prepare(`
      INSERT INTO "User" ("id", "name", "email", "isActive", "emailVerifiedAt", "createdAt", "updatedAt")
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `).run("user-support-2", "Other Fixture", "other-support@example.test", timestamp, timestamp, timestamp);
    const insert = database.prepare(`
      INSERT INTO "VipSubscriptionClaim"
        ("id", "userId", "provider", "providerReference", "activeReferenceKey", "amountTry", "status", "createdAt", "updatedAt")
      VALUES (?, ?, 'PARAM', 'SAME-REF', ?, 100, 'PENDING', ?, ?)
    `);
    insert.run("claim-1", "user-support", "PARAM:SAME-REF", timestamp, timestamp);
    expect(() => insert.run(
      "claim-2",
      "user-support-2",
      "PARAM:SAME-REF",
      timestamp,
      timestamp,
    )).toThrow(/UNIQUE constraint failed/);

    database.prepare(`
      UPDATE "VipSubscriptionClaim"
      SET "status" = 'REJECTED', "activeReferenceKey" = NULL, "updatedAt" = ?
      WHERE "id" = 'claim-1'
    `).run(timestamp);
    expect(insert.run(
      "claim-2",
      "user-support-2",
      "PARAM:SAME-REF",
      timestamp,
      timestamp,
    ).changes).toBe(1);
  });
});
