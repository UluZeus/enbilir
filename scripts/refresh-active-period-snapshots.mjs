#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

const initialCashUsd = 1_000_000;
const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const confirmProduction = args.has("--confirm-production");

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Only SQLite file: DATABASE_URL values are supported. Received: ${databaseUrl}`);
  }

  const rawPath = databaseUrl.slice("file:".length);
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function parseFallbackPrices() {
  const sourcePath = path.resolve(process.cwd(), "src/lib/market-data.ts");
  const source = readFileSync(sourcePath, "utf8");
  const prices = new Map();

  for (const match of source.matchAll(/\[\s*"([^"]+)"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*([-0-9.]+)\s*,/g)) {
    prices.set(match[1], Number(match[2]));
  }

  for (const match of source.matchAll(/\[\s*"([^"]+)"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*"[^"]+"\s*,\s*([-0-9.]+)\s*,/g)) {
    prices.set(match[1], Number(match[2]));
  }

  for (const match of source.matchAll(/\{\s*symbol:\s*"([^"]+)".*?priceUsd:\s*([-0-9.]+)/gs)) {
    prices.set(match[1], Number(match[2]));
  }

  return prices;
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

function safePriceUsd(position, fallbackPrices) {
  const fallbackPrice = fallbackPrices.get(position.symbol);

  if (Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
    return fallbackPrice;
  }

  return position.averagePriceUsd;
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : "NaN";
}

const databasePath = resolveDatabasePath();

if (!existsSync(databasePath)) {
  throw new Error(`Database file not found: ${databasePath}`);
}

if (apply && databasePath.includes("production.db") && !confirmProduction) {
  throw new Error("Refusing to update production.db without --confirm-production. Run dry-run first and review the report.");
}

const db = new Database(databasePath);
const fallbackPrices = parseFallbackPrices();
const now = Date.now();

const users = db.prepare(`
  SELECT id, email, name, nickname, displayNameMode
  FROM User
  ORDER BY email ASC
`).all();
const activePeriods = db.prepare(`
  SELECT id, type, name, startsAt, endsAt
  FROM CompetitionPeriod
  WHERE isActive = 1
`).all().filter((period) => {
  const startsAt = new Date(period.startsAt).getTime();
  const endsAt = new Date(period.endsAt).getTime();

  return Number.isFinite(startsAt) && Number.isFinite(endsAt) && startsAt <= now && endsAt >= now;
});

const accountStmt = db.prepare("SELECT cashAmount, cashMode FROM VirtualAccount WHERE userId = ?");
const positionsStmt = db.prepare("SELECT symbol, quantity, averagePriceUsd FROM PortfolioPosition WHERE userId = ? ORDER BY symbol ASC");
const tradesCountStmt = db.prepare("SELECT COUNT(*) AS count FROM VirtualTrade WHERE userId = ?");
const snapshotStmt = db.prepare("SELECT id, portfolioValueUsd, cashUsd, positionsValueUsd, returnPercent, rank FROM PortfolioSnapshot WHERE userId = ? AND periodId = ?");
const upsertSnapshotStmt = db.prepare(`
  INSERT INTO PortfolioSnapshot (id, userId, periodId, portfolioValueUsd, cashUsd, positionsValueUsd, returnPercent, rank, capturedAt)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(userId, periodId) DO UPDATE SET
    portfolioValueUsd = excluded.portfolioValueUsd,
    cashUsd = excluded.cashUsd,
    positionsValueUsd = excluded.positionsValueUsd,
    returnPercent = excluded.returnPercent,
    rank = excluded.rank,
    capturedAt = excluded.capturedAt
`);

function calculateUserPortfolio(user) {
  const account = accountStmt.get(user.id);
  const positions = positionsStmt.all(user.id);
  const rows = positions.map((position) => {
    const currentPriceUsd = safePriceUsd(position, fallbackPrices);

    return {
      ...position,
      currentPriceUsd,
      valueUsd: position.quantity * currentPriceUsd,
    };
  });
  const cashUsd = account ? cashToUsd(account.cashAmount, account.cashMode) : initialCashUsd;
  const positionsValueUsd = rows.reduce((sum, row) => sum + row.valueUsd, 0);
  const totalPortfolioValueUsd = cashUsd + positionsValueUsd;

  return {
    cashUsd,
    positionsValueUsd,
    totalPortfolioValueUsd,
    returnPercent: ((totalPortfolioValueUsd - initialCashUsd) / initialCashUsd) * 100,
    positions: rows,
    tradesCount: tradesCountStmt.get(user.id).count,
  };
}

console.log(`Mode: ${apply ? "APPLY" : "DRY-RUN"}`);
console.log(`Database: ${databasePath}`);

if (activePeriods.length === 0) {
  console.log("No active persisted CompetitionPeriod records found. Nothing to refresh.");
  process.exit(0);
}

const reportsByPeriod = activePeriods.map((period) => {
  const rows = users.map((user) => {
    const calculated = calculateUserPortfolio(user);
    const existing = snapshotStmt.get(user.id, period.id) ?? null;

    return {
      period,
      user,
      existing,
      ...calculated,
    };
  }).sort((a, b) => b.returnPercent - a.returnPercent)
    .map((row, index) => ({ ...row, rank: index + 1 }));

  return { period, rows };
});

for (const { period, rows } of reportsByPeriod) {
  console.log(`\nPeriod: ${period.type} / ${period.name} / ${period.id}`);
  console.table(rows.map((row) => ({
    email: row.user.email,
    oldSnapshot: row.existing ? formatNumber(row.existing.portfolioValueUsd) : "MISSING",
    newValue: formatNumber(row.totalPortfolioValueUsd),
    cashUsd: formatNumber(row.cashUsd),
    positionsValueUsd: formatNumber(row.positionsValueUsd),
    positionsCount: row.positions.length,
    tradesCount: row.tradesCount,
    rank: row.rank,
  })));

  for (const row of rows) {
    if (row.positions.length === 0) {
      continue;
    }

    console.log(`Positions for ${row.user.email}:`);
    console.table(row.positions.map((position) => ({
      symbol: position.symbol,
      quantity: position.quantity,
      averagePriceUsd: position.averagePriceUsd,
      currentPriceUsd: position.currentPriceUsd,
      valueUsd: position.valueUsd,
    })));
  }
}

if (!apply) {
  console.log("\nDry-run only. To update snapshots after review:");
  console.log("  node scripts/refresh-active-period-snapshots.mjs --apply");
  console.log("For production.db, require explicit confirmation:");
  console.log("  DATABASE_URL=file:/srv/enbilir/data/production.db node scripts/refresh-active-period-snapshots.mjs --apply --confirm-production");
  process.exit(0);
}

const capturedAt = new Date().toISOString();
const updateSnapshots = db.transaction(() => {
  for (const { period, rows } of reportsByPeriod) {
    for (const row of rows) {
      const id = row.existing?.id ?? `snap_${period.id}_${row.user.id}`;
      upsertSnapshotStmt.run(
        id,
        row.user.id,
        period.id,
        row.totalPortfolioValueUsd,
        row.cashUsd,
        row.positionsValueUsd,
        row.returnPercent,
        row.rank,
        capturedAt,
      );
    }
  }
});

updateSnapshots();
console.log("\nSnapshot refresh applied. No rows were deleted.");
