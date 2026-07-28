import { createHash } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import Database from "better-sqlite3";
import { afterEach, describe, expect, it } from "vitest";

import {
  validateNewestBackup,
  validateRestoreRehearsalMarker,
} from "@/lib/operations/backup-readiness";

const temporaryRoots: string[] = [];

function sha256(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function createBackupFixture() {
  const root = mkdtempSync(path.join(tmpdir(), "enbilir-backup-readiness-"));
  temporaryRoots.push(root);
  const setName = "enbilir-20260728T120000Z";
  const setPath = path.join(root, setName);
  const databasePath = path.join(setPath, "database.db");
  mkdirSync(setPath);
  const database = new Database(databasePath);
  database.exec(`
    CREATE TABLE _prisma_migrations (
      migration_name TEXT NOT NULL,
      finished_at TEXT,
      rolled_back_at TEXT
    );
    INSERT INTO _prisma_migrations (migration_name, finished_at, rolled_back_at)
    VALUES ('001_initial', '2026-07-28T11:00:00.000Z', NULL);
  `);
  database.close();
  const databaseSha256 = sha256(databasePath);
  writeFileSync(
    path.join(setPath, "manifest.json"),
    JSON.stringify({
      version: 1,
      setName,
      createdAt: "2026-07-28T12:00:00.000Z",
      database: { integrityCheck: "ok", completedMigrationCount: 1 },
      files: [
        {
          path: "database.db",
          sizeBytes: statSync(databasePath).size,
          sha256: databaseSha256,
        },
      ],
    }),
  );
  writeFileSync(
    path.join(root, "last-restore-rehearsal.json"),
    JSON.stringify({
      version: 1,
      rehearsedAt: "2026-07-28T12:30:00.000Z",
      backupSet: setName,
      databaseSha256,
    }),
  );
  return { root, setName, databasePath };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe("backup readiness validation", () => {
  it("accepts only a checksum-valid SQLite backup and a marker bound to that backup", async () => {
    const fixture = createBackupFixture();

    await expect(validateNewestBackup(fixture.root)).resolves.toMatchObject({
      setName: fixture.setName,
      createdAt: new Date("2026-07-28T12:00:00.000Z"),
    });
    await expect(validateRestoreRehearsalMarker(fixture.root)).resolves.toEqual({
      rehearsedAt: new Date("2026-07-28T12:30:00.000Z"),
      backupSet: fixture.setName,
    });
  });

  it("fails when the backup checksum or rehearsal binding is forged", async () => {
    const fixture = createBackupFixture();
    writeFileSync(fixture.databasePath, "corrupt");
    await expect(validateNewestBackup(fixture.root)).rejects.toThrow(/metadata|checksum/);

    const second = createBackupFixture();
    const markerPath = path.join(second.root, "last-restore-rehearsal.json");
    const marker = JSON.parse(readFileSync(markerPath, "utf8"));
    marker.databaseSha256 = "0".repeat(64);
    writeFileSync(markerPath, JSON.stringify(marker));
    await expect(validateRestoreRehearsalMarker(second.root)).rejects.toThrow(/does not match/);
  });
});
