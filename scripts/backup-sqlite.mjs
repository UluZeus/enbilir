import { copyFileSync, chmodSync, mkdirSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import path from "node:path";

import Database from "better-sqlite3";

import { requireBackupSourceDirectory } from "./lib/backup-source.mjs";
import {
  getSqliteDatabasePath,
  isSafeChildPath,
  loadLocalEnvironment,
  requireExternalAbsoluteDirectory,
  sha256File,
} from "./lib/operations.mjs";

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
    if (!isSafeChildPath(sourceRoot, source) || !isSafeChildPath(destinationRoot, destination)) {
      throw new Error("Unsafe upload path detected.");
    }
    if (entry.isSymbolicLink()) {
      throw new Error("Symbolic links are refused in upload backups.");
    }
    if (entry.isDirectory()) {
      copyTree(source, destination, manifestRoot, files, label);
      continue;
    }
    if (!entry.isFile()) continue;
    copyFileSync(source, destination);
    if (process.platform !== "win32") chmodSync(destination, 0o600);
    files.push({
      path: path.relative(manifestRoot, destination).split(path.sep).join("/"),
      sizeBytes: statSync(destination).size,
      sha256: sha256File(destination),
    });
  }
}

loadLocalEnvironment();
const apply = process.argv.includes("--apply");
const databasePath = getSqliteDatabasePath();
const backupRoot = requireExternalAbsoluteDirectory(
  process.env.BACKUP_DIR || path.join(process.cwd(), ".data", "backups"),
  "BACKUP_DIR",
);

if (!apply) {
  console.log("[backup] Dry-run complete. Use --apply to create an atomic backup set.");
  process.exit(0);
}

mkdirSync(backupRoot, { recursive: true, mode: 0o700 });
const setName = `enbilir-${timestampForName()}`;
const partialPath = path.join(backupRoot, `.partial-${setName}-${process.pid}`);
const finalPath = path.join(backupRoot, setName);
mkdirSync(partialPath, { recursive: false, mode: 0o700 });

try {
  const databaseDestination = path.join(partialPath, "database.db");
  const sourceDatabase = new Database(databasePath, { readonly: true, fileMustExist: true });
  await sourceDatabase.backup(databaseDestination);
  sourceDatabase.close();

  const backupDatabase = new Database(databaseDestination, { readonly: true, fileMustExist: true });
  const integrityRows = backupDatabase.pragma("integrity_check");
  const integrityOk =
    integrityRows.length === 1 &&
    String(integrityRows[0]?.integrity_check || integrityRows[0]?.["integrity_check"]).toLowerCase() === "ok";
  const migrationCount = backupDatabase
    .prepare("SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")
    .get()?.count;
  backupDatabase.close();
  if (!integrityOk) throw new Error("Backup integrity_check did not return ok.");
  if (!Number.isInteger(migrationCount) || migrationCount < 1) {
    throw new Error("Backup does not contain a completed Prisma migration history.");
  }
  if (process.platform !== "win32") chmodSync(databaseDestination, 0o600);

  const files = [
    {
      path: "database.db",
      sizeBytes: statSync(databaseDestination).size,
      sha256: sha256File(databaseDestination),
    },
  ];
  const uploadRoot = path.join(partialPath, "uploads");
  const chatUploadDirectory = process.env.CHAT_UPLOAD_DIR
    ? requireExternalAbsoluteDirectory(process.env.CHAT_UPLOAD_DIR, "CHAT_UPLOAD_DIR")
    : undefined;
  const adminUploadDirectory = process.env.ADMIN_UPLOAD_DIR
    ? requireExternalAbsoluteDirectory(process.env.ADMIN_UPLOAD_DIR, "ADMIN_UPLOAD_DIR")
    : undefined;
  copyTree(chatUploadDirectory, path.join(uploadRoot, "chat"), partialPath, files, "CHAT_UPLOAD_DIR");
  copyTree(adminUploadDirectory, path.join(uploadRoot, "admin"), partialPath, files, "ADMIN_UPLOAD_DIR");

  const manifest = {
    version: 1,
    setName,
    createdAt: new Date().toISOString(),
    database: {
      integrityCheck: "ok",
      completedMigrationCount: migrationCount,
    },
    uploadScope: {
      chat: Boolean(chatUploadDirectory),
      admin: Boolean(adminUploadDirectory),
    },
    files: files.sort((left, right) => left.path.localeCompare(right.path)),
  };
  const manifestPath = path.join(partialPath, "manifest.json");
  writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
  renameSync(partialPath, finalPath);
  console.log(`[backup] Created and verified backup set ${setName}.`);
} catch (error) {
  rmSync(partialPath, { recursive: true, force: true });
  throw error;
}
