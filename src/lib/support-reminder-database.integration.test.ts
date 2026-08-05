import { spawnSync } from "node:child_process";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { canUseDisposableMysql, createDisposableMysqlDatabase } from "../../scripts/lib/disposable-mysql.mjs";
import { MysqlCliDatabase } from "../../scripts/lib/mysql-cli.mjs";

const describeMysql = canUseDisposableMysql() ? describe : describe.skip;
let disposable: ReturnType<typeof createDisposableMysqlDatabase>;
let database: MysqlCliDatabase;

describeMysql("support reminder disposable MySQL constraints", () => {
  beforeAll(() => {
    disposable = createDisposableMysqlDatabase({ purpose: "test" });
    const prismaCli = path.join(process.cwd(), "node_modules", "prisma", "build", "index.js");
    const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
      cwd: process.cwd(),
      env: { ...process.env, ENBILIR_ENV: "test", DATABASE_URL: disposable.databaseUrl },
      encoding: "utf8",
      stdio: "pipe",
    });
    if (result.status !== 0) throw new Error("Disposable MySQL migration failed; provider output was withheld.");
    database = new MysqlCliDatabase({ defaultsFile: disposable.defaultsFile, database: disposable.database });
    const timestamp = new Date("2026-07-29T12:00:00.000Z");
    const insertUser = database.prepare(`
      INSERT INTO \`User\` (id, name, email, isActive, emailVerifiedAt, createdAt, updatedAt)
      VALUES (?, ?, ?, 1, ?, ?, ?)
    `);
    insertUser.run("user-support", "Support Fixture", "support@enbilir.invalid", timestamp, timestamp, timestamp);
    insertUser.run("user-support-2", "Other Fixture", "other-support@enbilir.invalid", timestamp, timestamp, timestamp);
  }, 120_000);

  afterAll(() => disposable?.drop());

  it("enforces one period and entry token per account period", () => {
    const timestamp = new Date("2026-07-29T12:00:00.000Z");
    const insertPeriod = database.prepare(`
      INSERT INTO \`SupportReminderPeriod\` (id, userId, periodKey, onsitePromptCount, createdAt, updatedAt)
      VALUES (?, ?, ?, 0, ?, ?)
    `);
    expect(insertPeriod.run("period-1", "user-support", "2026-07", timestamp, timestamp).changes).toBe(1);
    expect(() => insertPeriod.run("period-2", "user-support", "2026-07", timestamp, timestamp)).toThrow();
    const insertEntry = database.prepare(`
      INSERT INTO \`SupportReminderEntry\` (id, userId, periodId, entryTokenHash, createdAt)
      VALUES (?, ?, ?, ?, ?)
    `);
    insertEntry.run("entry-1", "user-support", "period-1", "a".repeat(64), timestamp);
    expect(() => insertEntry.run("entry-2", "user-support", "period-1", "a".repeat(64), timestamp)).toThrow();
  });

  it("allows only one live Param claim owner and releases rejected references", () => {
    const timestamp = new Date("2026-07-29T12:00:00.000Z");
    const insert = database.prepare(`
      INSERT INTO \`VipSubscriptionClaim\`
        (id, userId, provider, providerReference, activeReferenceKey, amountTry, status, createdAt, updatedAt)
      VALUES (?, ?, 'PARAM', 'SAME-REF', ?, 100, 'PENDING', ?, ?)
    `);
    insert.run("claim-1", "user-support", "PARAM:SAME-REF", timestamp, timestamp);
    expect(() => insert.run("claim-2", "user-support-2", "PARAM:SAME-REF", timestamp, timestamp)).toThrow();
    database.exec(
      "UPDATE `VipSubscriptionClaim` SET status = 'REJECTED', activeReferenceKey = NULL, updatedAt = '2026-07-29 12:00:00.000' WHERE id = 'claim-1';",
    );
    expect(insert.run("claim-2", "user-support-2", "PARAM:SAME-REF", timestamp, timestamp).changes).toBe(1);
  });
});
