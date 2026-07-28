import { chmodSync, copyFileSync, existsSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import Database from "better-sqlite3";

import {
  isSafeChildPath,
  loadLocalEnvironment,
  requireExternalAbsoluteDirectory,
  sha256File,
} from "./lib/operations.mjs";

function getArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

loadLocalEnvironment();
const backupRoot = requireExternalAbsoluteDirectory(
  process.env.BACKUP_DIR || path.join(process.cwd(), ".data", "backups"),
  "BACKUP_DIR",
);
const requestedSet = getArgument("--set");
if (!requestedSet || path.basename(requestedSet) !== requestedSet || requestedSet.startsWith(".")) {
  throw new Error("Specify a backup set directory name with --set.");
}
const setPath = path.join(backupRoot, requestedSet);
if (!isSafeChildPath(backupRoot, setPath)) throw new Error("Unsafe backup set path.");

const manifestPath = path.join(setPath, "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest.version !== 1 || manifest.setName !== requestedSet || !Array.isArray(manifest.files)) {
  throw new Error("Backup manifest is invalid.");
}

for (const file of manifest.files) {
  if (!file || typeof file.path !== "string" || typeof file.sha256 !== "string") {
    throw new Error("Backup manifest file entry is invalid.");
  }
  const source = path.join(setPath, file.path);
  if (!isSafeChildPath(setPath, source) || !existsSync(source)) {
    throw new Error("Backup manifest references an unsafe or missing file.");
  }
  if (statSync(source).size !== file.sizeBytes || sha256File(source) !== file.sha256) {
    throw new Error(`Backup checksum mismatch for ${file.path}.`);
  }
}

const rehearsalDirectory = mkdtempSync(path.join(tmpdir(), "enbilir-restore-rehearsal-"));
try {
  const restoredDatabasePath = path.join(rehearsalDirectory, "restored.db");
  copyFileSync(path.join(setPath, "database.db"), restoredDatabasePath);
  if (process.platform !== "win32") chmodSync(restoredDatabasePath, 0o600);
  const database = new Database(restoredDatabasePath, { readonly: true, fileMustExist: true });
  const integrity = database.pragma("integrity_check");
  const integrityOk =
    integrity.length === 1 &&
    String(integrity[0]?.integrity_check || integrity[0]?.["integrity_check"]).toLowerCase() === "ok";
  const migrations = database
    .prepare("SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")
    .get()?.count;
  database.close();
  if (!integrityOk || !Number.isInteger(migrations) || migrations < 1) {
    throw new Error("Restored database failed integrity or migration-history validation.");
  }

  if (process.argv.includes("--record")) {
    writeFileSync(
      path.join(backupRoot, "last-restore-rehearsal.json"),
      `${JSON.stringify(
        {
          version: 1,
          rehearsedAt: new Date().toISOString(),
          backupSet: requestedSet,
          databaseSha256: sha256File(restoredDatabasePath),
        },
        null,
        2,
      )}\n`,
      { encoding: "utf8", mode: 0o600 },
    );
  }
  console.log(`[restore-rehearsal] Backup set ${requestedSet} passed checksum and SQLite integrity checks.`);
} finally {
  rmSync(rehearsalDirectory, { recursive: true, force: true });
}
