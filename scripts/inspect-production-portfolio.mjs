#!/usr/bin/env node
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Only SQLite file: DATABASE_URL values are supported. Received: ${databaseUrl}`);
  }

  const rawPath = databaseUrl.slice("file:".length);

  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function cashToUsd(amount, mode) {
  const rates = {
    USD: 1,
    EUR: 1.08,
    CHF: 1.1,
    TRY_REPO: 1 / 32.4,
  };

  return amount * (rates[mode] ?? 1);
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "NaN";
}

const databasePath = resolveDatabasePath();

if (!existsSync(databasePath)) {
  throw new Error(`Database file not found: ${databasePath}`);
}

const db = new Database(databasePath, { readonly: true, fileMustExist: true });

const users = db.prepare(`
  SELECT id, email, name, role
  FROM User
  ORDER BY email ASC
`).all();
const accountStmt = db.prepare(`
  SELECT cashAmount, cashMode
  FROM VirtualAccount
  WHERE userId = ?
`);
const positionsStmt = db.prepare(`
  SELECT symbol, name, market, quantity, averagePriceUsd
  FROM PortfolioPosition
  WHERE userId = ?
  ORDER BY symbol ASC
`);
const tradesCountStmt = db.prepare(`
  SELECT COUNT(*) AS count
  FROM VirtualTrade
  WHERE userId = ?
`);

console.log("Mode: READ-ONLY");
console.log(`Database: ${databasePath}`);
console.log(`Users: ${users.length}`);

const summaryRows = [];

for (const user of users) {
  const account = accountStmt.get(user.id) ?? null;
  const positions = positionsStmt.all(user.id);
  const tradeCount = tradesCountStmt.get(user.id).count;
  const cashAmount = account?.cashAmount ?? null;
  const cashMode = account?.cashMode ?? "NO_ACCOUNT";
  const cashUsd = account ? cashToUsd(account.cashAmount, account.cashMode) : 0;
  const positionRows = positions.map((position) => ({
    symbol: position.symbol,
    name: position.name,
    market: position.market,
    quantity: position.quantity,
    averagePriceUsd: position.averagePriceUsd,
    computedValueAtAveragePrice: position.quantity * position.averagePriceUsd,
  }));
  const positionsValueAtAveragePrice = positionRows.reduce(
    (sum, position) => sum + position.computedValueAtAveragePrice,
    0,
  );
  const totalAtAveragePrice = cashUsd + positionsValueAtAveragePrice;

  summaryRows.push({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    cashAmount: cashAmount === null ? "NO_ACCOUNT" : formatNumber(cashAmount),
    cashMode,
    cashUsd: formatNumber(cashUsd),
    positionsCount: positions.length,
    tradesCount: tradeCount,
    positionsValueAtAveragePrice: formatNumber(positionsValueAtAveragePrice),
    totalAtAveragePrice: formatNumber(totalAtAveragePrice),
  });

  console.log(`\nUser: ${user.email}`);
  console.table([summaryRows.at(-1)]);

  if (positionRows.length > 0) {
    console.table(positionRows.map((position) => ({
      ...position,
      quantity: formatNumber(position.quantity),
      averagePriceUsd: formatNumber(position.averagePriceUsd),
      computedValueAtAveragePrice: formatNumber(position.computedValueAtAveragePrice),
    })));
  } else {
    console.log("No PortfolioPosition rows.");
  }
}

console.log("\nSummary");
console.table(summaryRows);

const usersWithTradesNoPositions = summaryRows.filter((row) => row.tradesCount > 0 && row.positionsCount === 0);
const usersWithPositionsDefaultCash = summaryRows.filter(
  (row) => row.positionsCount > 0 && row.cashMode === "USD" && row.cashAmount === formatNumber(1_000_000),
);

console.log("\nSignals");
console.table([
  {
    signal: "trades > 0 and positions = 0",
    count: usersWithTradesNoPositions.length,
    emails: usersWithTradesNoPositions.map((row) => row.email).join(", ") || "-",
  },
  {
    signal: "positions > 0 and USD cash still 1,000,000",
    count: usersWithPositionsDefaultCash.length,
    emails: usersWithPositionsDefaultCash.map((row) => row.email).join(", ") || "-",
  },
]);
