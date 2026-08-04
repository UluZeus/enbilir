import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import path from "node:path";

const mocks = vi.hoisted(() => ({
  readdir: vi.fn(),
  statfsSync: vi.fn(),
  queryRaw: vi.fn(),
  executeRawUnsafe: vi.fn(),
  transaction: vi.fn(),
  findMany: vi.fn(),
  upsert: vi.fn(),
  validateNewestBackup: vi.fn(),
  validateRestoreRehearsalMarker: vi.fn(),
}));

vi.mock("node:fs", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs")>();
  return {
    ...original,
    statfsSync: mocks.statfsSync,
  };
});

vi.mock("node:fs/promises", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:fs/promises")>();
  return {
    ...original,
    readdir: mocks.readdir,
  };
});

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    $transaction: mocks.transaction,
    operationalJobHeartbeat: {
      findMany: mocks.findMany,
      upsert: mocks.upsert,
    },
  },
}));

vi.mock("@/lib/operations/backup-readiness", () => ({
  validateNewestBackup: mocks.validateNewestBackup,
  validateRestoreRehearsalMarker: mocks.validateRestoreRehearsalMarker,
}));

vi.mock("@/lib/operations/runtime-config", () => ({
  getRuntimeConfigIssues: () => [],
  resolveRuntimeEnvironment: () => "production",
}));

import { getOperationalReadiness } from "@/lib/operations/health";

describe("operational readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const syntheticRuntimeRoot = path.resolve("synthetic-health-runtime");
    vi.stubEnv("DATABASE_URL", "mysql://synthetic.invalid/enbilir_synthetic");
    vi.stubEnv("BACKUP_DIR", path.join(syntheticRuntimeRoot, "backups"));
    vi.stubEnv("MIN_FREE_DISK_BYTES", "1073741824");
    vi.stubEnv("BACKUP_MAX_AGE_HOURS", "26");
    vi.stubEnv("RESTORE_REHEARSAL_MAX_AGE_HOURS", String(24 * 31));
    vi.stubEnv(
      "REQUIRED_JOB_HEARTBEATS",
      "ai-agent:120,subscription-emails:1560,weekly-competition:11640,chat-upload-cleanup:1560",
    );
    mocks.transaction.mockImplementation(async (callback) => callback({ $executeRawUnsafe: mocks.executeRawUnsafe }));
    mocks.executeRawUnsafe.mockResolvedValue(1);
    mocks.readdir.mockResolvedValue([
      { name: "20260804000000_mysql_baseline", isDirectory: () => true },
    ]);
    mocks.statfsSync.mockReturnValue({ bavail: 2_000_000, bsize: 4_096 });
    mocks.queryRaw
      .mockResolvedValueOnce([{ "1": 1 }])
      .mockResolvedValueOnce([
        {
          migration_name: "20260804000000_mysql_baseline",
          finished_at: new Date("2026-07-29T09:00:00.000Z"),
          rolled_back_at: null,
        },
      ]);
    mocks.findMany.mockResolvedValue([
      { jobKey: "ai-agent", lastSucceededAt: new Date("2026-07-29T09:55:00.000Z"), lastFailedAt: null },
      { jobKey: "subscription-emails", lastSucceededAt: new Date("2026-07-29T09:55:00.000Z"), lastFailedAt: null },
      { jobKey: "weekly-competition", lastSucceededAt: new Date("2026-07-29T09:55:00.000Z"), lastFailedAt: null },
      { jobKey: "chat-upload-cleanup", lastSucceededAt: new Date("2026-07-29T09:55:00.000Z"), lastFailedAt: null },
    ]);
    mocks.validateNewestBackup.mockResolvedValue({
      setName: "enbilir-20260729T090000Z",
      createdAt: new Date("2026-07-29T09:00:00.000Z"),
      databaseSha256: "a".repeat(64),
    });
    mocks.validateRestoreRehearsalMarker.mockResolvedValue({
      rehearsedAt: new Date("2026-07-29T09:00:00.000Z"),
      backupSet: "enbilir-20260729T090000Z",
    });
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("checks MySQL readability and temporary-table writability without mutating operational heartbeats", async () => {
    const result = await getOperationalReadiness(new Date("2026-07-29T10:00:00.000Z"));

    expect(result.ready).toBe(true);
    expect(result.checks).toContainEqual({ name: "database-read-write", status: "pass" });
    expect(mocks.readdir).toHaveBeenCalledWith(
      path.join(process.cwd(), "prisma", "migrations-mysql"),
      { withFileTypes: true },
    );
    expect(mocks.executeRawUnsafe).toHaveBeenCalledTimes(3);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
});
