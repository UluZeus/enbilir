import { spawnSync } from "node:child_process";
import {
  closeSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readdirSync,
  rmSync,
} from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

const root = process.cwd();
const prismaCli = path.join(root, "node_modules", "prisma", "build", "index.js");
const testRoot = mkdtempSync(path.join(root, ".tmp-migration-upgrade-"));
const testPrisma = path.join(testRoot, "prisma");
const testMigrations = path.join(testPrisma, "migrations");
const testConfig = path.join(testRoot, "prisma.config.ts");
const databasePath = path.join(testRoot, "upgrade.db");
const databaseUrl = `file:${databasePath.replaceAll("\\", "/")}`;
const p0Migration = "20260728120000_p0_financial_integrity";
const p1Migration = "20260728150000_p1_audit_and_trade_accounting";

function runPrisma(args) {
  const result = spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: root,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    encoding: "utf8",
    stdio: "pipe",
    shell: false,
  });
  if (result.status !== 0) {
    const output = [result.stdout, result.stderr].filter(Boolean).join("\n");
    throw new Error(`Prisma ${args.join(" ")} failed.\n${output}`);
  }
}

try {
  mkdirSync(testMigrations, { recursive: true });
  cpSync(path.join(root, "prisma", "schema.prisma"), path.join(testPrisma, "schema.prisma"));
  cpSync(path.join(root, "prisma.config.ts"), testConfig);
  cpSync(
    path.join(root, "prisma", "migrations", "migration_lock.toml"),
    path.join(testMigrations, "migration_lock.toml"),
  );

  for (const migrationName of readdirSync(path.join(root, "prisma", "migrations"))) {
    if (migrationName >= p0Migration || migrationName === "migration_lock.toml") continue;
    cpSync(
      path.join(root, "prisma", "migrations", migrationName),
      path.join(testMigrations, migrationName),
      { recursive: true },
    );
  }

  closeSync(openSync(databasePath, "a"));
  runPrisma(["migrate", "deploy", "--config", testConfig]);

  const database = new Database(databasePath);
  database.pragma("foreign_keys = ON");
  const now = new Date();
  const paidUntil = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1_000);
  database
    .prepare("INSERT INTO User(id, name, email, updatedAt) VALUES (?, ?, ?, ?)")
    .run("upgrade-user", "Upgrade User", "upgrade@example.test", now.toISOString());
  database
    .prepare(
      `INSERT INTO VipSubscriptionPayment
        (id, userId, provider, providerReference, amountTry, paidAt, paidUntil, createdAt)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      "upgrade-payment",
      "upgrade-user",
      "PARAM",
      "upgrade-reference",
      100,
      now.toISOString(),
      paidUntil.toISOString(),
      now.toISOString(),
    );
  database.close();

  for (const migrationName of [p0Migration, p1Migration]) {
    cpSync(
      path.join(root, "prisma", "migrations", migrationName),
      path.join(testMigrations, migrationName),
      { recursive: true },
    );
  }

  runPrisma(["migrate", "deploy", "--config", testConfig]);
  runPrisma(["migrate", "deploy", "--config", testConfig]);

  const verified = new Database(databasePath, { readonly: true });
  const payment = verified
    .prepare(
      `SELECT providerReference, currency, status, updatedAt
       FROM VipSubscriptionPayment
       WHERE id = ?`,
    )
    .get("upgrade-payment");
  const integrity = verified.pragma("integrity_check", { simple: true });
  const foreignKeyErrors = verified.pragma("foreign_key_check");
  const pendingOrFailed = verified
    .prepare(
      `SELECT COUNT(*) AS count
       FROM _prisma_migrations
       WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
    )
    .get().count;
  verified.close();

  if (
    payment?.providerReference !== "upgrade-reference" ||
    payment?.currency !== "TRY" ||
    payment?.status !== "PAID" ||
    !payment?.updatedAt
  ) {
    throw new Error("Legacy VIP payment data was not preserved during migration.");
  }
  if (integrity !== "ok" || foreignKeyErrors.length > 0 || pendingOrFailed !== 0) {
    throw new Error(
      `Migration integrity failed (integrity=${integrity}, foreignKeys=${foreignKeyErrors.length}, pending=${pendingOrFailed}).`,
    );
  }

  console.log("[migration-upgrade] legacy data upgrade, integrity, and idempotency checks passed.");
} finally {
  rmSync(testRoot, { recursive: true, force: true, maxRetries: 8, retryDelay: 250 });
}
