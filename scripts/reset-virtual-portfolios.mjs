#!/usr/bin/env node
import crypto from "node:crypto";

import { MysqlCliDatabase } from "./lib/mysql-cli.mjs";
import { loadLocalEnvironment } from "./lib/operations.mjs";

const initialCashUsd = 1_000_000;
const apply = process.argv.includes("--apply");
const confirmProduction = process.argv.includes("--confirm-production");

loadLocalEnvironment();
const productionLike = process.env.ENBILIR_ENV === "production" || (!process.env.ENBILIR_ENV && process.env.NODE_ENV === "production");
if (apply && productionLike && (
  !confirmProduction || process.env.CONFIRM_VIRTUAL_PORTFOLIO_RESET !== "RESET_ALL_VIRTUAL_PORTFOLIOS"
)) {
  throw new Error("Production reset refused without the release guard, --confirm-production, and exact reset confirmation.");
}

const database = new MysqlCliDatabase();
const users = database.prepare("SELECT id FROM `User` ORDER BY id").all();
const counts = {
  users: users.length,
  positions: Number(database.prepare("SELECT COUNT(*) AS count FROM `PortfolioPosition`").get().count),
  trades: Number(database.prepare("SELECT COUNT(*) AS count FROM `VirtualTrade`").get().count),
  snapshots: Number(database.prepare("SELECT COUNT(*) AS count FROM `PortfolioSnapshot`").get().count),
};
if (!apply) {
  console.log(JSON.stringify({ mode: "DRY_RUN", ...counts, cashPerUserUsd: initialCashUsd }));
  process.exit(0);
}

const clearPositions = database.prepare("DELETE FROM `PortfolioPosition`");
const clearTrades = database.prepare("DELETE FROM `VirtualTrade`");
const clearSnapshots = database.prepare("DELETE FROM `PortfolioSnapshot`");
const upsertAccount = database.prepare(`
  INSERT INTO \`VirtualAccount\`
    (id, userId, cashMode, cashAmount, baseCurrency, dailyRepoRate, repoLastAccruedAt, createdAt, updatedAt)
  VALUES (?, ?, 'USD', ?, 'USD', 0.00125000, NULL, UTC_TIMESTAMP(3), UTC_TIMESTAMP(3))
  ON DUPLICATE KEY UPDATE cashMode = VALUES(cashMode), cashAmount = VALUES(cashAmount),
    baseCurrency = VALUES(baseCurrency), dailyRepoRate = VALUES(dailyRepoRate),
    repoLastAccruedAt = NULL, updatedAt = UTC_TIMESTAMP(3)
`);
database.transaction(() => {
  clearSnapshots.run();
  clearPositions.run();
  clearTrades.run();
  for (const user of users) upsertAccount.run(crypto.randomUUID(), user.id, initialCashUsd);
})();
console.log(JSON.stringify({ mode: "APPLIED", ...counts, cashPerUserUsd: initialCashUsd }));
