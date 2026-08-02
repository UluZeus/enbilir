import {
  chmodSync,
  existsSync,
  linkSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import {
  applyBackupHealthAccess,
  applyBackupHealthAccessPlan,
  buildBackupHealthAccessPlan,
  publishBackupSet,
  publishRestoreRehearsalMarker,
  resolveBackupHealthGroupId,
} from "../../../scripts/lib/backup-health-access.mjs";

const temporaryRoots: string[] = [];
const setName = "enbilir-20260729T120000Z";

function createBackupFixture(physicalSetName = setName) {
  const root = mkdtempSync(path.join(tmpdir(), "enbilir-backup-health-access-"));
  temporaryRoots.push(root);
  const setPath = path.join(root, physicalSetName);
  const chatDirectory = path.join(setPath, "uploads", "chat");
  mkdirSync(chatDirectory, { recursive: true });
  writeFileSync(path.join(setPath, "database.db"), "database");
  writeFileSync(path.join(chatDirectory, "message.txt"), "upload");
  writeFileSync(
    path.join(setPath, "manifest.json"),
    JSON.stringify({
      version: 1,
      setName,
      files: [
        { path: "database.db" },
        { path: "uploads/chat/message.txt" },
      ],
    }),
  );
  writeFileSync(path.join(root, "last-restore-rehearsal.json"), "{}");
  return { root, setPath };
}

function createVirtualPermissionHarness(shouldFailChown?: (entryPath: string) => boolean) {
  const ownership = new Map<string, { uid: number; gid: number }>();
  const modes = new Map<string, number>();
  const changes: Array<{ operation: string; path: string; uid?: number; gid?: number; mode?: number }> = [];
  const lstatOperation = (entryPath: unknown) => {
    const normalizedPath = String(entryPath);
    const stats = lstatSync(normalizedPath);
    const owner = ownership.get(normalizedPath);
    const configuredMode = modes.get(normalizedPath);
    return new Proxy(stats, {
      get(target, property) {
        if (property === "uid" && owner) return owner.uid;
        if (property === "gid" && owner) return owner.gid;
        if (property === "mode" && configuredMode !== undefined) {
          return (Number(target.mode) & ~0o777) | configuredMode;
        }
        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  };
  return {
    changes,
    lstatOperation,
    permissionOperations: {
      chown: (entryPath: unknown, uid: number, gid: number) => {
        const normalizedPath = String(entryPath);
        if (shouldFailChown?.(normalizedPath)) throw new Error("synthetic marker chown failure");
        changes.push({ operation: "chown", path: normalizedPath, uid, gid });
        ownership.set(normalizedPath, { uid, gid });
      },
      chmod: (entryPath: unknown, mode: unknown) => {
        const normalizedPath = String(entryPath);
        const numericMode = Number(mode);
        changes.push({ operation: "chmod", path: normalizedPath, mode: numericMode });
        modes.set(normalizedPath, numericMode);
      },
    },
  };
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    rmSync(root, { recursive: true, force: true });
  }
});

describe("backup health metadata access", () => {
  it("builds a least-privilege plan that exposes only metadata and directory traversal", () => {
    const fixture = createBackupFixture();
    const plan = buildBackupHealthAccessPlan({
      backupRoot: fixture.root,
      setName,
      groupId: 987,
      includeRestoreMarker: true,
    });

    expect(plan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: fixture.root, kind: "directory", uid: 0, gid: 987, mode: 0o750 }),
        expect.objectContaining({ path: fixture.setPath, kind: "directory", uid: 0, gid: 987, mode: 0o750 }),
        expect.objectContaining({
          path: path.join(fixture.setPath, "uploads"),
          kind: "directory",
          uid: 0,
          gid: 987,
          mode: 0o750,
        }),
        expect.objectContaining({
          path: path.join(fixture.setPath, "uploads", "chat"),
          kind: "directory",
          uid: 0,
          gid: 987,
          mode: 0o750,
        }),
        expect.objectContaining({
          path: path.join(fixture.setPath, "manifest.json"),
          kind: "metadata",
          uid: 0,
          gid: 987,
          mode: 0o640,
        }),
        expect.objectContaining({
          path: path.join(fixture.root, "last-restore-rehearsal.json"),
          kind: "metadata",
          uid: 0,
          gid: 987,
          mode: 0o640,
        }),
        expect.objectContaining({
          path: path.join(fixture.setPath, "database.db"),
          kind: "payload",
          uid: 0,
          gid: 0,
          mode: 0o600,
        }),
        expect.objectContaining({
          path: path.join(fixture.setPath, "uploads", "chat", "message.txt"),
          kind: "payload",
          uid: 0,
          gid: 0,
          mode: 0o600,
        }),
      ]),
    );
    expect(plan.every((entry) => entry.snapshot.dev !== undefined && entry.snapshot.ino !== undefined)).toBe(true);
  });

  it("rejects invalid group ids and manifest path traversal", () => {
    expect(() => resolveBackupHealthGroupId("0", { NODE_ENV: "production", ENBILIR_ENV: "production" })).toThrow(
      /BACKUP_HEALTH_GID/,
    );
    expect(() =>
      resolveBackupHealthGroupId("12.5", { NODE_ENV: "production", ENBILIR_ENV: "production" }),
    ).toThrow(
      /BACKUP_HEALTH_GID/,
    );
    expect(() =>
      resolveBackupHealthGroupId(undefined, { NODE_ENV: "production", ENBILIR_ENV: "production" }),
    ).toThrow(
      /BACKUP_HEALTH_GID/,
    );
    expect(
      resolveBackupHealthGroupId(undefined, { NODE_ENV: "development", ENBILIR_ENV: "development" }),
    ).toBeNull();

    const fixture = createBackupFixture();
    writeFileSync(
      path.join(fixture.setPath, "manifest.json"),
      JSON.stringify({
        version: 1,
        setName,
        files: [{ path: "../outside.db" }],
      }),
    );

    expect(() =>
      buildBackupHealthAccessPlan({
        backupRoot: fixture.root,
        setName,
        groupId: 987,
      }),
    ).toThrow(/manifest/i);
  });

  it("distinguishes an explicit missing group id from the ambient production group id", () => {
    const previousGroupId = process.env.BACKUP_HEALTH_GID;
    process.env.BACKUP_HEALTH_GID = "987";

    try {
      expect(() =>
        resolveBackupHealthGroupId(undefined, { NODE_ENV: "production", ENBILIR_ENV: "production" }),
      ).toThrow(/BACKUP_HEALTH_GID/);
      expect(
        resolveBackupHealthGroupId(undefined, { NODE_ENV: "development", ENBILIR_ENV: "development" }),
      ).toBeNull();
      expect(resolveBackupHealthGroupId()).toBe(987);
    } finally {
      if (previousGroupId === undefined) {
        delete process.env.BACKUP_HEALTH_GID;
      } else {
        process.env.BACKUP_HEALTH_GID = previousGroupId;
      }
    }
  });

  it.runIf(process.platform !== "win32")(
    "rejects symbolic links before changing permissions (POSIX-only; Windows requires elevated symlink privileges)",
    () => {
      const fixture = createBackupFixture();
      const linkedPath = path.join(fixture.setPath, "uploads", "linked.txt");
      symlinkSync(path.join(fixture.setPath, "database.db"), linkedPath);
      chmodSync(fixture.root, 0o700);

      expect(() =>
        buildBackupHealthAccessPlan({
          backupRoot: fixture.root,
          setName,
          groupId: 987,
        }),
      ).toThrow(/symbolic link/i);
    },
  );

  it("validates the complete plan before applying root-only payload permissions", () => {
    const fixture = createBackupFixture();
    const harness = createVirtualPermissionHarness();

    applyBackupHealthAccess({
      backupRoot: fixture.root,
      setName,
      groupId: 987,
      platform: "linux",
      getEuid: () => 0,
      lstatOperation: harness.lstatOperation,
      permissionOperations: harness.permissionOperations,
    });

    const databasePath = path.join(fixture.setPath, "database.db");
    expect(harness.changes).toEqual(
      expect.arrayContaining([
        { operation: "chown", path: databasePath, uid: 0, gid: 0 },
        { operation: "chmod", path: databasePath, mode: 0o600 },
      ]),
    );

    harness.changes.length = 0;
    writeFileSync(
      path.join(fixture.setPath, "manifest.json"),
      JSON.stringify({ version: 1, setName, files: [{ path: "../outside.db" }] }),
    );
    expect(() =>
      applyBackupHealthAccess({
        backupRoot: fixture.root,
        setName,
        groupId: 987,
        platform: "linux",
        getEuid: () => 0,
        lstatOperation: harness.lstatOperation,
        permissionOperations: harness.permissionOperations,
      }),
    ).toThrow(/manifest/i);
    expect(harness.changes).toEqual([]);
  });

  it("rejects hard-linked payloads before any permission mutation", () => {
    const fixture = createBackupFixture();
    const outsidePath = path.join(fixture.root, "outside-hardlink.db");
    linkSync(path.join(fixture.setPath, "database.db"), outsidePath);
    const changes: string[] = [];

    expect(() =>
      applyBackupHealthAccess({
        backupRoot: fixture.root,
        setName,
        groupId: 987,
        platform: "linux",
        getEuid: () => 0,
        permissionOperations: {
          chown: () => changes.push("chown"),
          chmod: () => changes.push("chmod"),
        },
      }),
    ).toThrow(/hard link/i);
    expect(changes).toEqual([]);
  });

  it("fails before planning or mutation when the POSIX process is not root", () => {
    const fixture = createBackupFixture();
    const changes: string[] = [];

    expect(() =>
      applyBackupHealthAccess({
        backupRoot: fixture.root,
        setName,
        groupId: 987,
        platform: "linux",
        getEuid: () => 1000,
        permissionOperations: {
          chown: () => changes.push("chown"),
          chmod: () => changes.push("chmod"),
        },
      }),
    ).toThrow(/root/i);
    expect(changes).toEqual([]);
  });

  it("revalidates the inode snapshot before every permission mutation", () => {
    const fixture = createBackupFixture();
    const plan = buildBackupHealthAccessPlan({
      backupRoot: fixture.root,
      setName,
      groupId: 987,
    });
    const changes: string[] = [];
    const changedPath = plan[0].path;
    const changedStats = lstatSync(changedPath, { bigint: true });
    const changedSnapshotStats = {
      ...changedStats,
      dev: changedStats.dev + BigInt(1),
      isFile: () => changedStats.isFile(),
      isDirectory: () => changedStats.isDirectory(),
      isSymbolicLink: () => changedStats.isSymbolicLink(),
    } as typeof changedStats;

    expect(() =>
      applyBackupHealthAccessPlan({
        plan,
        platform: "linux",
        getEuid: () => 0,
        lstatOperation: (entryPath: unknown) =>
          String(entryPath) === changedPath
            ? changedSnapshotStats
            : lstatSync(String(entryPath), { bigint: true }),
        permissionOperations: {
          chown: () => changes.push("chown"),
          chmod: () => changes.push("chmod"),
        },
      }),
    ).toThrow(/changed after validation/i);
    expect(changes).toEqual([]);

    let changedAfterChown = false;
    expect(() =>
      applyBackupHealthAccessPlan({
        plan,
        platform: "linux",
        getEuid: () => 0,
        lstatOperation: (entryPath: unknown) => {
          const normalizedPath = String(entryPath);
          if (changedAfterChown && normalizedPath === changedPath) return changedSnapshotStats;
          return lstatSync(normalizedPath, { bigint: true });
        },
        permissionOperations: {
          chown: () => {
            changes.push("chown");
            changedAfterChown = true;
          },
          chmod: () => changes.push("chmod"),
        },
      }),
    ).toThrow(/changed after validation/i);
    expect(changes).toEqual(["chown"]);
  });

  it("never publishes a partial backup when a permission operation fails", () => {
    const physicalSetName = `.partial-${setName}-4242`;
    const fixture = createBackupFixture(physicalSetName);
    const finalPath = path.join(fixture.root, setName);
    let chownCount = 0;

    expect(() =>
      publishBackupSet({
        backupRoot: fixture.root,
        setName,
        physicalSetName,
        groupId: 987,
        platform: "linux",
        getEuid: () => 0,
        permissionOperations: {
          chown: () => {
            chownCount += 1;
            if (chownCount === 3) throw new Error("synthetic chown failure");
          },
          chmod: () => undefined,
        },
      }),
    ).toThrow(/synthetic chown failure/);
    expect(existsSync(finalPath)).toBe(false);
    expect(existsSync(fixture.setPath)).toBe(true);
  });

  it("preserves the last good restore marker when temporary marker permissions fail", () => {
    const fixture = createBackupFixture();
    const markerPath = path.join(fixture.root, "last-restore-rehearsal.json");
    const originalMarker = readFileSync(markerPath, "utf8");
    const invalidSetChanges: string[] = [];
    expect(() =>
      publishRestoreRehearsalMarker({
        backupRoot: fixture.root,
        setName: `${setName}-invalid`,
        marker: {},
        groupId: 987,
        platform: "linux",
        getEuid: () => 0,
        permissionOperations: {
          chown: () => invalidSetChanges.push("chown"),
          chmod: () => invalidSetChanges.push("chmod"),
        },
      }),
    ).toThrow(/set name/i);
    expect(invalidSetChanges).toEqual([]);
    expect(readFileSync(markerPath, "utf8")).toBe(originalMarker);

    const harness = createVirtualPermissionHarness((entryPath) =>
      path.basename(entryPath).startsWith(".last-restore-rehearsal-"),
    );

    expect(() =>
      publishRestoreRehearsalMarker({
        backupRoot: fixture.root,
        setName,
        marker: {
          version: 1,
          rehearsedAt: "2026-07-29T12:00:00.000Z",
          backupSet: setName,
          databaseSha256: "a".repeat(64),
        },
        groupId: 987,
        platform: "linux",
        getEuid: () => 0,
        lstatOperation: harness.lstatOperation,
        permissionOperations: harness.permissionOperations,
      }),
    ).toThrow(/synthetic marker chown failure/);
    expect(readFileSync(markerPath, "utf8")).toBe(originalMarker);
  });

  it.runIf(process.platform === "win32")("validates safely without attempting POSIX ownership changes on Windows", () => {
    const fixture = createBackupFixture();

    expect(
      applyBackupHealthAccess({
        backupRoot: fixture.root,
        setName,
        groupId: 987,
        platform: "win32",
      }),
    ).toEqual({ applied: false, groupId: 987 });
  });
});
