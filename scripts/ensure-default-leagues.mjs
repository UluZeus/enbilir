#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import process from "node:process";
import Database from "better-sqlite3";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const confirmProduction = args.has("--confirm-production");

const defaultLeagues = [
  {
    id: "default_league_rotaryen",
    name: "ROTARYEN",
    slug: "rotaryen",
    type: "ROTARY",
    inviteCode: "ROTARYEN",
    description: "Rotaryen kullanıcılar için ana portföy yarışması ve finansal okuryazarlık ligi.",
  },
  {
    id: "default_league_rotaract",
    name: "ROTARACT",
    slug: "rotaract",
    type: "ROTARACT",
    inviteCode: "ROTARACT",
    description: "Rotaract üyeleri ve genç profesyoneller için açık portföy yarışması ligi.",
  },
  {
    id: "default_league_serbest",
    name: "SERBEST",
    slug: "serbest",
    type: "GENERAL",
    inviteCode: "SERBEST",
    description: "Rotary ve Rotaract dışından katılan tüm meraklı kullanıcılar için genel lig.",
  },
];

function loadDotenvDatabaseUrl() {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return null;
  }

  const source = readFileSync(envPath, "utf8");
  const match = source.match(/^DATABASE_URL=(.*)$/m);

  if (!match) {
    return null;
  }

  return match[1].trim().replace(/^["']|["']$/g, "");
}

function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL ?? loadDotenvDatabaseUrl() ?? "file:./dev.db";

  if (!databaseUrl.startsWith("file:")) {
    throw new Error(`Only SQLite file: DATABASE_URL values are supported. Received: ${databaseUrl}`);
  }

  const rawPath = databaseUrl.slice("file:".length);
  return path.isAbsolute(rawPath) ? rawPath : path.resolve(process.cwd(), rawPath);
}

function nowIso() {
  return new Date().toISOString();
}

const databasePath = resolveDatabasePath();

if (!existsSync(databasePath)) {
  throw new Error(`Database file not found: ${databasePath}`);
}

if (apply && databasePath.includes("production.db") && !confirmProduction) {
  throw new Error("Refusing to update production.db without --confirm-production.");
}

const db = new Database(databasePath);

const owner = db.prepare(`
  SELECT id
  FROM "User"
  ORDER BY
    CASE role
      WHEN 'MASTER_ADMIN' THEN 0
      WHEN 'ADMIN' THEN 1
      ELSE 2
    END,
    createdAt ASC
  LIMIT 1
`).get();

if (!owner) {
  console.log("No users found. Default leagues will be created after the first user registers.");
  process.exit(0);
}

const users = db.prepare(`SELECT id FROM "User"`).all();
const existingRotaryen = db.prepare(`SELECT id FROM "League" WHERE slug = 'rotaryen'`).get();
const rotaryenLeagueId = existingRotaryen?.id ?? "default_league_rotaryen";
const inviteConflictStmt = db.prepare(`SELECT slug FROM "League" WHERE inviteCode = ? AND slug <> ?`);

for (const league of defaultLeagues) {
  const conflict = inviteConflictStmt.get(league.inviteCode, league.slug);

  if (conflict) {
    league.inviteCode = `${league.inviteCode}${Math.floor(1000 + Math.random() * 9000)}`;
  }
}

console.log(`Database: ${databasePath}`);
console.log(`Owner user: ${owner.id}`);
console.log(`Users to ensure in ROTARYEN: ${users.length}`);

if (!apply) {
  console.log("Dry-run only. Add --apply to write changes.");
  process.exit(0);
}

const upsertLeague = db.prepare(`
  INSERT INTO "League" (id, name, slug, description, type, inviteCode, createdByUserId, isActive, createdAt, updatedAt)
  VALUES (@id, @name, @slug, @description, @type, @inviteCode, @createdByUserId, 1, @createdAt, @updatedAt)
  ON CONFLICT(slug) DO UPDATE SET
    name = excluded.name,
    description = excluded.description,
    type = excluded.type,
    isActive = 1,
    updatedAt = excluded.updatedAt
`);

const insertMembership = db.prepare(`
  INSERT OR IGNORE INTO "LeagueMembership" (id, leagueId, userId, role, joinedAt)
  VALUES (@id, @leagueId, @userId, 'MEMBER', @joinedAt)
`);

const write = db.transaction(() => {
  const stamp = nowIso();

  for (const league of defaultLeagues) {
    upsertLeague.run({
      ...league,
      createdByUserId: owner.id,
      createdAt: stamp,
      updatedAt: stamp,
    });
  }

  for (const user of users) {
    insertMembership.run({
      id: `default_rotaryen_${user.id}`,
      leagueId: rotaryenLeagueId,
      userId: user.id,
      joinedAt: stamp,
    });
  }
});

write();

console.log("Default leagues are ready: ROTARYEN, ROTARACT, SERBEST.");
console.log("All existing users were ensured as ROTARYEN members.");
