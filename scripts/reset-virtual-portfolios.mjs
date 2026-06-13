#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import process from "node:process";
import Database from "better-sqlite3";

const initialCashUsd = 1_000_000;

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Only SQLite file: DATABASE_URL values are supported. Received: ${databaseUrl}`);
  }

  const rawPath = databaseUrl.slice("file:".length);
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "NaN";
}

const databasePath = resolveDatabasePath();

if (!existsSync(databasePath)) {
  throw new Error(`Database file not found: ${databasePath}`);
}

const db = new Database(databasePath);
const users = db.prepare(`
  SELECT id, email
  FROM User
  ORDER BY email ASC
`).all();

const clearPositions = db.prepare(`DELETE FROM PortfolioPosition`);
const clearTrades = db.prepare(`DELETE FROM VirtualTrade`);
const clearSnapshots = db.prepare(`DELETE FROM PortfolioSnapshot`);
const upsertAccount = db.prepare(`
  INSERT INTO VirtualAccount (
    id,
    userId,
    cashMode,
    cashAmount,
    baseCurrency,
    dailyRepoRate,
    repoLastAccruedAt,
    createdAt,
    updatedAt
  )
  VALUES (
    @id,
    @userId,
    @cashMode,
    @cashAmount,
    @baseCurrency,
    @dailyRepoRate,
    @repoLastAccruedAt,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
  )
  ON CONFLICT(userId) DO UPDATE SET
    cashMode = excluded.cashMode,
    cashAmount = excluded.cashAmount,
    baseCurrency = excluded.baseCurrency,
    dailyRepoRate = excluded.dailyRepoRate,
    repoLastAccruedAt = excluded.repoLastAccruedAt,
    updatedAt = CURRENT_TIMESTAMP
`);

const reset = db.transaction(() => {
  const deletedPositions = clearPositions.run().changes;
  const deletedTrades = clearTrades.run().changes;
  const deletedSnapshots = clearSnapshots.run().changes;

  for (const user of users) {
    upsertAccount.run({
      id: crypto.randomUUID(),
      userId: user.id,
      cashMode: "USD",
      cashAmount: initialCashUsd,
      baseCurrency: "USD",
      dailyRepoRate: 0.00125,
      repoLastAccruedAt: null,
    });
  }

  return {
    users: users.length,
    deletedPositions,
    deletedTrades,
    deletedSnapshots,
  };
});

try {
  const result = reset();
  console.log("Virtual portfolio reset completed.");
  console.table([
    {
      users: result.users,
      deletedPositions: formatNumber(result.deletedPositions),
      deletedTrades: formatNumber(result.deletedTrades),
      deletedSnapshots: formatNumber(result.deletedSnapshots),
      cashPerUserUsd: formatNumber(initialCashUsd),
    },
  ]);
} finally {
  db.close();
}
