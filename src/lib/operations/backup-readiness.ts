import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import path from "node:path";

import Database from "better-sqlite3";

type BackupManifestFile = {
  path: string;
  sizeBytes: number;
  sha256: string;
};

type BackupManifest = {
  version: number;
  setName: string;
  createdAt: string;
  database: {
    integrityCheck: string;
    completedMigrationCount: number;
  };
  files: BackupManifestFile[];
};

const backupSetPattern = /^enbilir-\d{8}T\d{6}Z$/;
const sha256Pattern = /^[a-f0-9]{64}$/;

async function assertSafeBackupRoot(backupRoot: string) {
  const rootStats = await lstat(backupRoot);
  if (!path.isAbsolute(backupRoot) || rootStats.isSymbolicLink() || !rootStats.isDirectory()) {
    throw new Error("Backup root is unsafe.");
  }
}

function isSafeChildPath(rootPath: string, candidatePath: string) {
  const relative = path.relative(path.resolve(rootPath), path.resolve(candidatePath));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

async function sha256File(filePath: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function readJsonFile(filePath: string) {
  const fileStats = await lstat(filePath);
  if (fileStats.isSymbolicLink() || !fileStats.isFile() || fileStats.size <= 0 || fileStats.size > 2 * 1024 * 1024) {
    throw new Error("Operational JSON file has an invalid size.");
  }
  return JSON.parse(await readFile(filePath, "utf8")) as unknown;
}

function parseManifest(value: unknown, expectedSetName: string): BackupManifest {
  if (!value || typeof value !== "object") throw new Error("Backup manifest is invalid.");
  const manifest = value as Partial<BackupManifest>;
  if (
    manifest.version !== 1 ||
    manifest.setName !== expectedSetName ||
    typeof manifest.createdAt !== "string" ||
    !Number.isFinite(Date.parse(manifest.createdAt)) ||
    manifest.database?.integrityCheck !== "ok" ||
    !Number.isSafeInteger(manifest.database.completedMigrationCount) ||
    manifest.database.completedMigrationCount < 1 ||
    !Array.isArray(manifest.files) ||
    manifest.files.length < 1
  ) {
    throw new Error("Backup manifest is invalid.");
  }
  return manifest as BackupManifest;
}

function parseManifestFile(value: unknown): BackupManifestFile {
  if (!value || typeof value !== "object") throw new Error("Backup manifest file entry is invalid.");
  const file = value as Partial<BackupManifestFile>;
  if (
    typeof file.path !== "string" ||
    !file.path ||
    file.path.includes("\\") ||
    path.posix.isAbsolute(file.path) ||
    file.path.split("/").some((segment) => segment === "" || segment === "." || segment === "..") ||
    typeof file.sizeBytes !== "number" ||
    !Number.isSafeInteger(file.sizeBytes) ||
    file.sizeBytes < 0 ||
    typeof file.sha256 !== "string" ||
    !sha256Pattern.test(file.sha256)
  ) {
    throw new Error("Backup manifest file entry is invalid.");
  }
  return file as BackupManifestFile;
}

async function readValidatedManifest(backupRoot: string, setName: string) {
  if (!backupSetPattern.test(setName)) throw new Error("Backup set name is invalid.");
  const setPath = path.join(backupRoot, setName);
  const setStats = await lstat(setPath);
  if (!isSafeChildPath(backupRoot, setPath) || setStats.isSymbolicLink() || !setStats.isDirectory()) {
    throw new Error("Backup set path is unsafe.");
  }
  const manifest = parseManifest(await readJsonFile(path.join(setPath, "manifest.json")), setName);
  const files = manifest.files.map(parseManifestFile);
  if (new Set(files.map((file) => file.path)).size !== files.length) {
    throw new Error("Backup manifest contains duplicate paths.");
  }
  return { setPath, manifest: { ...manifest, files } };
}

async function inspectBackupSetMetadata(backupRoot: string, setName: string) {
  const { setPath, manifest } = await readValidatedManifest(backupRoot, setName);
  for (const file of manifest.files) {
    const filePath = path.join(setPath, ...file.path.split("/"));
    if (!isSafeChildPath(setPath, filePath)) throw new Error("Backup file path is unsafe.");
    const fileStats = await lstat(filePath);
    if (!fileStats.isFile() || fileStats.isSymbolicLink() || fileStats.size !== file.sizeBytes) {
      throw new Error("Backup file metadata does not match its manifest.");
    }
  }

  const databaseEntry = manifest.files.find((file) => file.path === "database.db");
  if (!databaseEntry) throw new Error("Backup manifest does not contain database.db.");
  return { setPath, manifest, databaseEntry };
}

export async function validateBackupSet(backupRoot: string, setName: string) {
  const { setPath, manifest, databaseEntry } = await inspectBackupSetMetadata(backupRoot, setName);
  for (const file of manifest.files) {
    const filePath = path.join(setPath, ...file.path.split("/"));
    if ((await sha256File(filePath)) !== file.sha256) {
      throw new Error("Backup file checksum does not match its manifest.");
    }
  }

  const databasePath = path.join(setPath, "database.db");
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const integrityRows = database.pragma("integrity_check") as Array<Record<string, unknown>>;
    const integrityOk =
      integrityRows.length === 1 &&
      String(integrityRows[0]?.integrity_check || integrityRows[0]?.["integrity_check"]).toLowerCase() === "ok";
    const migrationCount = (
      database
        .prepare("SELECT COUNT(*) AS count FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL")
        .get() as { count?: number } | undefined
    )?.count;
    if (!integrityOk || migrationCount !== manifest.database.completedMigrationCount) {
      throw new Error("Backup database integrity or migration history does not match its manifest.");
    }
  } finally {
    database.close();
  }

  return {
    setName,
    createdAt: new Date(manifest.createdAt),
    databaseSha256: databaseEntry.sha256,
  };
}

export async function validateNewestBackup(backupRoot: string) {
  await assertSafeBackupRoot(backupRoot);
  const entries = await readdir(backupRoot, { withFileTypes: true });
  const setNames = entries
    .filter((entry) => entry.isDirectory() && backupSetPattern.test(entry.name))
    .map((entry) => entry.name)
    .sort()
    .reverse();
  if (!setNames[0]) throw new Error("No complete backup set exists.");
  const { manifest, databaseEntry } = await inspectBackupSetMetadata(backupRoot, setNames[0]);
  return {
    setName: setNames[0],
    createdAt: new Date(manifest.createdAt),
    databaseSha256: databaseEntry.sha256,
  };
}

export async function validateRestoreRehearsalMarker(backupRoot: string) {
  await assertSafeBackupRoot(backupRoot);
  const markerPath = path.join(backupRoot, "last-restore-rehearsal.json");
  const markerStats = await lstat(markerPath);
  if (!markerStats.isFile() || markerStats.isSymbolicLink()) {
    throw new Error("Restore rehearsal marker is unsafe.");
  }
  const value = await readJsonFile(markerPath);
  if (!value || typeof value !== "object") throw new Error("Restore rehearsal marker is invalid.");
  const marker = value as {
    version?: unknown;
    rehearsedAt?: unknown;
    backupSet?: unknown;
    databaseSha256?: unknown;
  };
  if (
    marker.version !== 1 ||
    typeof marker.rehearsedAt !== "string" ||
    !Number.isFinite(Date.parse(marker.rehearsedAt)) ||
    typeof marker.backupSet !== "string" ||
    !backupSetPattern.test(marker.backupSet) ||
    typeof marker.databaseSha256 !== "string" ||
    !sha256Pattern.test(marker.databaseSha256)
  ) {
    throw new Error("Restore rehearsal marker is invalid.");
  }
  const { databaseEntry } = await inspectBackupSetMetadata(backupRoot, marker.backupSet);
  if (databaseEntry.sha256 !== marker.databaseSha256) {
    throw new Error("Restore rehearsal marker does not match its verified backup set.");
  }
  return { rehearsedAt: new Date(marker.rehearsedAt), backupSet: marker.backupSet };
}
