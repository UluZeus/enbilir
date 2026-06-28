#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const confirmProduction = args.has("--confirm-production");
const captureOnly = args.has("--capture-baseline-only");
const publishOnly = args.has("--publish-only");
const initialCashUsd = 1_000_000;
const istOffsetMs = 3 * 60 * 60 * 1000;
const hourMs = 60 * 60 * 1000;
const dayMs = 24 * hourMs;

function loadDotenvDatabaseUrl() {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return null;
  }

  const match = readFileSync(envPath, "utf8").match(/^DATABASE_URL=(.*)$/m);
  return match?.[1]?.trim().replace(/^["']|["']$/g, "") ?? null;
}

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL ?? loadDotenvDatabaseUrl() ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Only SQLite file: DATABASE_URL values are supported. Received: ${databaseUrl}`);
  }

  const rawPath = databaseUrl.slice("file:".length);
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function getIstanbulMondayStartUtc(now = new Date()) {
  const istNow = new Date(now.getTime() + istOffsetMs);
  const day = istNow.getUTCDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const mondayIst = new Date(Date.UTC(istNow.getUTCFullYear(), istNow.getUTCMonth(), istNow.getUTCDate() + diffToMonday, 0, 0, 0, 0));

  return new Date(mondayIst.getTime() - istOffsetMs);
}

function getPublishedWeekWindow(now = new Date()) {
  const thisWeekStart = getIstanbulMondayStartUtc(now);
  const thisWeekPublishTime = new Date(thisWeekStart.getTime() + 7 * hourMs);
  const end = now.getTime() >= thisWeekPublishTime.getTime()
    ? thisWeekStart
    : new Date(thisWeekStart.getTime() - 7 * dayMs);
  const start = new Date(end.getTime() - 7 * dayMs);
  const endIst = new Date(end.getTime() + istOffsetMs);
  const periodKey = `${endIst.getUTCFullYear()}-${pad(endIst.getUTCMonth() + 1)}-${pad(endIst.getUTCDate())}`;

  return { start, end, periodKey, publishedAt: new Date(end.getTime() + 7 * hourMs) };
}

function getCurrentWeekBaselineKey(now = new Date()) {
  const currentWeekStart = getIstanbulMondayStartUtc(now);
  const end = new Date(currentWeekStart.getTime() + 7 * dayMs);
  const endIst = new Date(end.getTime() + istOffsetMs);

  return `${endIst.getUTCFullYear()}-${pad(endIst.getUTCMonth() + 1)}-${pad(endIst.getUTCDate())}`;
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

function displayName(user) {
  return user.displayNameMode === "NICKNAME" && user.nickname ? user.nickname : user.name;
}

function idPart(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "_");
}

const databasePath = resolveDatabasePath();

if (!existsSync(databasePath)) {
  throw new Error(`Database file not found: ${databasePath}`);
}

if (apply && databasePath.includes("production.db") && !confirmProduction) {
  throw new Error("Refusing to update production.db without --confirm-production.");
}

const db = new Database(databasePath);
const fallbackPrices = parseFallbackPrices();

function portfolioValueUsd(userId) {
  const account = db.prepare(`SELECT cashAmount, cashMode FROM "VirtualAccount" WHERE userId = ?`).get(userId);
  const positions = db.prepare(`SELECT symbol, quantity, averagePriceUsd FROM "PortfolioPosition" WHERE userId = ?`).all(userId);
  const cash = account ? cashToUsd(account.cashAmount, account.cashMode) : initialCashUsd;
  const positionsValue = positions.reduce((sum, position) => {
    const price = fallbackPrices.get(position.symbol);
    const safePrice = Number.isFinite(price) && price > 0 ? price : position.averagePriceUsd;

    return sum + position.quantity * safePrice;
  }, 0);

  return cash + positionsValue;
}

function weeklyTradeContribution(userId, start, end) {
  const trades = db.prepare(`
    SELECT symbol, side, quantity, priceUsd
    FROM "VirtualTrade"
    WHERE userId = ? AND createdAt >= ? AND createdAt < ?
  `).all(userId, start.toISOString(), end.toISOString());

  return trades.reduce((sum, trade) => {
    const price = fallbackPrices.get(trade.symbol);
    const safePrice = Number.isFinite(price) && price > 0 ? price : trade.priceUsd;
    const contribution = trade.side === "BUY"
      ? (safePrice - trade.priceUsd) * trade.quantity
      : (trade.priceUsd - safePrice) * trade.quantity;

    return sum + contribution;
  }, 0);
}

const users = db.prepare(`
  SELECT id, name, nickname, displayNameMode
  FROM "User"
  WHERE isActive = 1
  ORDER BY createdAt ASC
`).all();

const currentBaselineKey = getCurrentWeekBaselineKey();
const publishedWindow = getPublishedWeekWindow();

console.log(`Database: ${databasePath}`);
console.log(`Users: ${users.length}`);
console.log(`Current baseline key: ${currentBaselineKey}`);
console.log(`Publishing period: ${publishedWindow.periodKey}`);

if (!apply) {
  console.log("Dry-run only. Add --apply to write changes.");
  process.exit(0);
}

const upsertBaseline = db.prepare(`
  INSERT INTO "WeeklyPortfolioBaseline" (id, periodKey, userId, portfolioValueUsd, capturedAt)
  VALUES (@id, @periodKey, @userId, @portfolioValueUsd, @capturedAt)
  ON CONFLICT(periodKey, userId) DO UPDATE SET
    portfolioValueUsd = excluded.portfolioValueUsd,
    capturedAt = excluded.capturedAt
`);

const upsertPublication = db.prepare(`
  INSERT INTO "WeeklyCompetitionPublication" (id, periodKey, startsAt, endsAt, publishedAt, note, createdAt, updatedAt)
  VALUES (@id, @periodKey, @startsAt, @endsAt, @publishedAt, @note, @createdAt, @updatedAt)
  ON CONFLICT(periodKey) DO UPDATE SET
    startsAt = excluded.startsAt,
    endsAt = excluded.endsAt,
    publishedAt = excluded.publishedAt,
    note = excluded.note,
    updatedAt = excluded.updatedAt
`);

const deleteRows = db.prepare(`DELETE FROM "WeeklyCompetitionResultRow" WHERE publicationId = ?`);
const insertRow = db.prepare(`
  INSERT INTO "WeeklyCompetitionResultRow" (id, publicationId, scope, userId, displayName, valueUsd, returnPercent, rank, createdAt)
  VALUES (@id, @publicationId, @scope, @userId, @displayName, @valueUsd, @returnPercent, @rank, @createdAt)
`);
const baselineForUser = db.prepare(`SELECT portfolioValueUsd FROM "WeeklyPortfolioBaseline" WHERE periodKey = ? AND userId = ?`);

const write = db.transaction(() => {
  const stamp = new Date().toISOString();

  if (!publishOnly) {
    for (const user of users) {
      upsertBaseline.run({
        id: `weekly_baseline_${idPart(currentBaselineKey)}_${idPart(user.id)}`,
        periodKey: currentBaselineKey,
        userId: user.id,
        portfolioValueUsd: portfolioValueUsd(user.id),
        capturedAt: stamp,
      });
    }
  }

  if (captureOnly) {
    return;
  }

  const publicationId = `weekly_publication_${idPart(publishedWindow.periodKey)}`;
  let usedFallback = false;
  const totalRows = users.map((user) => {
    const valueUsd = portfolioValueUsd(user.id) - initialCashUsd;

    return {
      userId: user.id,
      displayName: displayName(user),
      valueUsd,
      returnPercent: (valueUsd / initialCashUsd) * 100,
    };
  }).sort((a, b) => b.valueUsd - a.valueUsd);

  const weeklyRows = users.map((user) => {
    const currentValue = portfolioValueUsd(user.id);
    const baseline = baselineForUser.get(publishedWindow.periodKey, user.id);
    const valueUsd = baseline
      ? currentValue - baseline.portfolioValueUsd
      : weeklyTradeContribution(user.id, publishedWindow.start, publishedWindow.end);

    if (!baseline) {
      usedFallback = true;
    }

    return {
      userId: user.id,
      displayName: displayName(user),
      valueUsd,
      returnPercent: (valueUsd / initialCashUsd) * 100,
    };
  }).sort((a, b) => b.valueUsd - a.valueUsd);

  upsertPublication.run({
    id: publicationId,
    periodKey: publishedWindow.periodKey,
    startsAt: publishedWindow.start.toISOString(),
    endsAt: publishedWindow.end.toISOString(),
    publishedAt: publishedWindow.publishedAt.toISOString(),
    note: usedFallback
      ? "Bu haftada başlangıç baseline kaydı eksik olan kullanıcılar için haftalık sanal işlem katkısı kullanıldı. Sonraki haftalar başlangıç portföy baseline'ı ile arşivlenecektir."
      : "Haftalık kazanç, dönem başlangıcı portföy baseline'ı ile yayın anındaki portföy değeri karşılaştırılarak hesaplandı.",
    createdAt: stamp,
    updatedAt: stamp,
  });
  deleteRows.run(publicationId);

  for (const [index, row] of weeklyRows.entries()) {
    insertRow.run({
      id: `weekly_row_${idPart(publishedWindow.periodKey)}_weekly_${idPart(row.userId)}`,
      publicationId,
      scope: "WEEKLY_GAIN",
      userId: row.userId,
      displayName: row.displayName,
      valueUsd: row.valueUsd,
      returnPercent: row.returnPercent,
      rank: index + 1,
      createdAt: stamp,
    });
  }

  for (const [index, row] of totalRows.entries()) {
    insertRow.run({
      id: `weekly_row_${idPart(publishedWindow.periodKey)}_total_${idPart(row.userId)}`,
      publicationId,
      scope: "TOTAL_GAIN",
      userId: row.userId,
      displayName: row.displayName,
      valueUsd: row.valueUsd,
      returnPercent: row.returnPercent,
      rank: index + 1,
      createdAt: stamp,
    });
  }
});

write();

console.log(captureOnly ? "Weekly baseline captured." : "Weekly competition publication is ready.");
