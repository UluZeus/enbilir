import { spawnSync } from "node:child_process";
import { copyFileSync, chmodSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import { publishBackupSet } from "./lib/backup-health-access.mjs";
import { requireBackupSourceDirectory } from "./lib/backup-source.mjs";
import { createMysqlCli, requireMysqlDatabase, requireMysqlDefaultsFile } from "./lib/mysql-cli.mjs";
import { isSafeChildPath, loadLocalEnvironment, requireExternalAbsoluteDirectory, sha256File } from "./lib/operations.mjs";

function timestampForName(date = new Date()) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function copyTree(sourceRoot, destinationRoot, manifestRoot, files, label) {
  if (!sourceRoot) return;
  requireBackupSourceDirectory(sourceRoot, label);
  mkdirSync(destinationRoot, { recursive: true, mode: 0o700 });
  for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
    const source = path.join(sourceRoot, entry.name);
    const destination = path.join(destinationRoot, entry.name);
    if (!isSafeChildPath(sourceRoot, source) || !isSafeChildPath(destinationRoot, destination)) throw new Error("Unsafe upload path detected.");
    if (entry.isSymbolicLink()) throw new Error("Symbolic links are refused in upload backups.");
    if (entry.isDirectory()) {
      copyTree(source, destination, manifestRoot, files, label);
    } else if (entry.isFile()) {
      copyFileSync(source, destination);
      if (process.platform !== "win32") chmodSync(destination, 0o600);
      files.push({
        path: path.relative(manifestRoot, destination).split(path.sep).join("/"),
        sizeBytes: statSync(destination).size,
        sha256: sha256File(destination),
      });
    }
  }
}

loadLocalEnvironment();
const apply = process.argv.includes("--apply");
const backupRoot = requireExternalAbsoluteDirectory(process.env.BACKUP_DIR || path.join(process.cwd(), ".data", "backups"), "BACKUP_DIR");
const defaultsFile = requireMysqlDefaultsFile();
const databaseName = requireMysqlDatabase();
if (!apply) {
  console.log("[backup] Dry-run complete. Use --apply to create an atomic MySQL backup set.");
  process.exit(0);
}

mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
const setName = `enbilir-${timestampForName()}`;
const physicalSetName = `.partial-${setName}-${process.pid}`;
const partialPath = path.join(backupRoot, physicalSetName);
mkdirSync(partialPath, { recursive: false, mode: 0o700 });

try {
  const databaseDestination = path.join(partialPath, "database.sql");
  const dumpResult = spawnSync(process.env.MYSQLDUMP_BINARY || "mysqldump", [
    `--defaults-extra-file=${defaultsFile}`,
    "--default-character-set=utf8mb4",
    "--single-transaction",
    "--quick",
    "--hex-blob",
    "--routines",
    "--events",
    "--triggers",
    "--no-tablespaces",
    `--result-file=${databaseDestination}`,
    databaseName,
  ], { cwd: process.cwd(), env: process.env, encoding: "utf8", maxBuffer: 1024 * 1024 });
  if (dumpResult.error || dumpResult.status !== 0) throw new Error("mysqldump failed; details were withheld from operational output.");
  const mysql = createMysqlCli({ defaultsFile, database: databaseName });
  const migrationCount = Number(mysql.queryScalar("SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL"));
  if (!Number.isSafeInteger(migrationCount) || migrationCount < 1 || statSync(databaseDestination).size < 1) {
    throw new Error("MySQL backup does not contain a valid dump or completed Prisma migration history.");
  }
  if (process.platform !== "win32") chmodSync(databaseDestination, 0o600);
  const files = [{ path: "database.sql", sizeBytes: statSync(databaseDestination).size, sha256: sha256File(databaseDestination) }];
  const chatUploadDirectory = process.env.CHAT_UPLOAD_DIR ? requireExternalAbsoluteDirectory(process.env.CHAT_UPLOAD_DIR, "CHAT_UPLOAD_DIR") : undefined;
  const adminUploadDirectory = process.env.ADMIN_UPLOAD_DIR ? requireExternalAbsoluteDirectory(process.env.ADMIN_UPLOAD_DIR, "ADMIN_UPLOAD_DIR") : undefined;
  copyTree(chatUploadDirectory, path.join(partialPath, "uploads", "chat"), partialPath, files, "CHAT_UPLOAD_DIR");
  copyTree(adminUploadDirectory, path.join(partialPath, "uploads", "admin"), partialPath, files, "ADMIN_UPLOAD_DIR");
  const manifest = {
    version: 2,
    setName,
    createdAt: new Date().toISOString(),
    database: { engine: "mysql", format: "mysqldump", completedMigrationCount: migrationCount },
    uploadScope: { chat: Boolean(chatUploadDirectory), admin: Boolean(adminUploadDirectory) },
    files: files.sort((left, right) => left.path.localeCompare(right.path)),
  };
  writeFileSync(path.join(partialPath, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  publishBackupSet({ backupRoot, setName, physicalSetName });
  console.log(`[backup] Created and verified MySQL backup set ${setName}.`);
} catch (error) {
  rmSync(partialPath, { recursive: true, force: true });
  throw error;
}
