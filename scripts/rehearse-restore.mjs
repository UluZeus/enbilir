import { spawn, spawnSync } from "node:child_process";
import { createReadStream, lstatSync, readFileSync } from "node:fs";
import path from "node:path";

import { assertBackupSetName, publishRestoreRehearsalMarker } from "./lib/backup-health-access.mjs";
import { buildMysqlArguments, createMysqlCli, requireMysqlDefaultsFile } from "./lib/mysql-cli.mjs";
import { isSafeChildPath, loadLocalEnvironment, requireExternalAbsoluteDirectory, sha256File } from "./lib/operations.mjs";

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function runServerSql(executable, defaultsFile, sql) {
  const result = spawnSync(executable, buildMysqlArguments({ defaultsFile, database: "unused", includeDatabase: false }), {
    cwd: process.cwd(), env: process.env, encoding: "utf8", input: sql, maxBuffer: 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error("mysql restore administration failed; details were withheld.");
}

async function restoreDump(executable, defaultsFile, database, dumpPath) {
  const child = spawn(executable, buildMysqlArguments({ defaultsFile, database }), {
    cwd: process.cwd(), env: process.env, stdio: ["pipe", "ignore", "ignore"],
  });
  createReadStream(dumpPath).pipe(child.stdin);
  const status = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("close", resolve);
  });
  if (status !== 0) throw new Error("mysql restore failed; details were withheld from operational output.");
}

loadLocalEnvironment();
const backupRoot = requireExternalAbsoluteDirectory(process.env.BACKUP_DIR || path.join(process.cwd(), ".data", "backups"), "BACKUP_DIR");
const requestedSet = getArgument("--set");
assertBackupSetName(requestedSet);
const setPath = path.join(backupRoot, requestedSet);
if (!isSafeChildPath(backupRoot, setPath)) throw new Error("Unsafe backup set path.");
const manifestPath = path.join(setPath, "manifest.json");
const manifestStats = lstatSync(manifestPath);
if (manifestStats.isSymbolicLink() || !manifestStats.isFile() || manifestStats.nlink !== 1) throw new Error("Backup manifest must be a single-link regular file.");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.version !== 2 || manifest.setName !== requestedSet || manifest.database?.engine !== "mysql" || !Array.isArray(manifest.files)) {
  throw new Error("Backup manifest is invalid.");
}
for (const file of manifest.files) {
  if (!file || typeof file.path !== "string" || typeof file.sha256 !== "string") throw new Error("Backup manifest file entry is invalid.");
  const source = path.join(setPath, file.path);
  if (!isSafeChildPath(setPath, source)) throw new Error("Backup manifest references an unsafe file.");
  const stats = lstatSync(source);
  if (stats.isSymbolicLink() || !stats.isFile() || stats.nlink !== 1 || stats.size !== file.sizeBytes || sha256File(source) !== file.sha256) {
    throw new Error("Backup checksum validation failed.");
  }
}
const dumpPath = path.join(setPath, "database.sql");
if (!manifest.files.some((file) => file.path === "database.sql")) throw new Error("Backup manifest does not contain database.sql.");
const defaultsFile = requireMysqlDefaultsFile();
const executable = process.env.MYSQL_BINARY || "mysql";
const rehearsalDatabase = `_enbilir_restore_${Date.now()}_${process.pid}`;
if (!/^_enbilir_restore_\d+_\d+$/.test(rehearsalDatabase)) throw new Error("Unsafe rehearsal database name.");

let created = false;
try {
  runServerSql(executable, defaultsFile, `CREATE DATABASE \`${rehearsalDatabase}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;`);
  created = true;
  await restoreDump(executable, defaultsFile, rehearsalDatabase, dumpPath);
  const mysql = createMysqlCli({ defaultsFile, database: rehearsalDatabase, executable });
  const migrations = Number(mysql.queryScalar("SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL"));
  if (!Number.isSafeInteger(migrations) || migrations !== manifest.database.completedMigrationCount) {
    throw new Error("Restored database migration history does not match the backup manifest.");
  }
  if (process.argv.includes("--record")) {
    publishRestoreRehearsalMarker({
      backupRoot,
      setName: requestedSet,
      marker: { version: 1, rehearsedAt: new Date().toISOString(), backupSet: requestedSet, databaseSha256: sha256File(dumpPath) },
    });
  }
  console.log(`[restore-rehearsal] Backup set ${requestedSet} passed checksum and isolated MySQL restore checks.`);
} finally {
  if (created) runServerSql(executable, defaultsFile, `DROP DATABASE \`${rehearsalDatabase}\`;`);
}
