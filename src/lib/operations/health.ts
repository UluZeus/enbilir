import "server-only";

import { constants as fsConstants, statfsSync } from "node:fs";
import { access, readdir } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { validateNewestBackup, validateRestoreRehearsalMarker } from "@/lib/operations/backup-readiness";
import { evaluateHeartbeatFreshness, getMissingMigrations } from "@/lib/operations/health-policy";
import { getRuntimeConfigIssues, resolveRuntimeEnvironment } from "@/lib/operations/runtime-config";

type CheckStatus = "pass" | "fail" | "warn";

export type OperationalHealthCheck = {
  name: string;
  status: CheckStatus;
};

export type OperationalReadiness = {
  ready: boolean;
  checks: OperationalHealthCheck[];
};

type MigrationRow = {
  migration_name: string;
  finished_at: Date | string | null;
  rolled_back_at: Date | string | null;
};

const defaultHeartbeatRequirements = {
  "ai-agent": 120,
  "subscription-emails": 1_560,
  "weekly-competition": 11_640,
  "chat-upload-cleanup": 1_560,
} as const;

function getSqlitePath(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl?.startsWith("file:")) {
    throw new Error("A SQLite file database is required.");
  }
  const databasePath = databaseUrl.slice("file:".length);
  return path.isAbsolute(databasePath)
    ? databasePath
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), databasePath);
}

async function getExpectedMigrations() {
  const migrationRoot = path.join(/* turbopackIgnore: true */ process.cwd(), "prisma", "migrations");
  const entries = await readdir(migrationRoot, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function parseHeartbeatRequirements() {
  const configured = process.env.REQUIRED_JOB_HEARTBEATS?.trim();
  if (!configured) return defaultHeartbeatRequirements;

  return Object.fromEntries(
    configured
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [jobKey, maxAge] = entry.split(":");
        const maxAgeMinutes = Number(maxAge);
        if (!jobKey || !Number.isFinite(maxAgeMinutes) || maxAgeMinutes <= 0) {
          throw new Error("REQUIRED_JOB_HEARTBEATS is invalid.");
        }
        return [jobKey, maxAgeMinutes];
      }),
  );
}

function getArtifactAgeHours(timestamp: Date, now: Date) {
  const difference = now.getTime() - timestamp.getTime();
  if (!Number.isFinite(difference) || difference < -5 * 60_000) return null;
  return Math.max(0, difference / 3_600_000);
}

export async function getOperationalReadiness(now = new Date()): Promise<OperationalReadiness> {
  const checks: OperationalHealthCheck[] = [];
  const runtimeEnvironment = resolveRuntimeEnvironment();
  const productionLike = runtimeEnvironment === "production";
  const configIssues = getRuntimeConfigIssues();
  checks.push({ name: "runtime-config", status: configIssues.length === 0 ? "pass" : "fail" });

  let databaseAvailable = false;
  try {
    const databasePath = getSqlitePath();
    await Promise.all([
      access(databasePath, fsConstants.R_OK | fsConstants.W_OK),
      access(path.dirname(databasePath), fsConstants.W_OK),
      prisma.$queryRaw`SELECT 1`,
    ]);
    databaseAvailable = true;
    checks.push({ name: "database-read-write", status: "pass" });
  } catch {
    checks.push({ name: "database-read-write", status: "fail" });
  }

  if (databaseAvailable) {
    try {
      const [expected, rows] = await Promise.all([
        getExpectedMigrations(),
        prisma.$queryRaw<MigrationRow[]>`
          SELECT migration_name, finished_at, rolled_back_at
          FROM _prisma_migrations
        `,
      ]);
      const missing = getMissingMigrations(
        expected,
        rows.map((row) => ({
          migrationName: row.migration_name,
          finishedAt: row.finished_at ? new Date(row.finished_at) : null,
          rolledBackAt: row.rolled_back_at ? new Date(row.rolled_back_at) : null,
        })),
      );
      checks.push({ name: "migrations", status: missing.length === 0 ? "pass" : "fail" });
    } catch {
      checks.push({ name: "migrations", status: "fail" });
    }
  } else {
    checks.push({ name: "migrations", status: "fail" });
  }

  try {
    const databaseDirectory = path.dirname(getSqlitePath());
    const disk = statfsSync(databaseDirectory);
    const freeBytes = Number(disk.bavail) * Number(disk.bsize);
    const minimumFreeBytes = Number(process.env.MIN_FREE_DISK_BYTES || 1_073_741_824);
    checks.push({
      name: "disk-capacity",
      status: Number.isFinite(minimumFreeBytes) && freeBytes >= minimumFreeBytes ? "pass" : "fail",
    });
  } catch {
    checks.push({ name: "disk-capacity", status: "fail" });
  }

  const backupRoot = process.env.BACKUP_DIR;
  if (productionLike) {
    if (!backupRoot || !path.isAbsolute(backupRoot)) {
      checks.push({ name: "backup-freshness", status: "fail" });
      checks.push({ name: "restore-rehearsal", status: "fail" });
    } else {
      const [backup, rehearsal] = await Promise.all([
        validateNewestBackup(backupRoot).catch(() => null),
        validateRestoreRehearsalMarker(backupRoot).catch(() => null),
      ]);
      const backupAgeHours = backup ? getArtifactAgeHours(backup.createdAt, now) : null;
      const rehearsalAgeHours = rehearsal ? getArtifactAgeHours(rehearsal.rehearsedAt, now) : null;
      const maximumBackupAge = Number(process.env.BACKUP_MAX_AGE_HOURS || 26);
      const maximumRehearsalAge = Number(process.env.RESTORE_REHEARSAL_MAX_AGE_HOURS || 24 * 31);
      checks.push({
        name: "backup-freshness",
        status: backupAgeHours !== null && backupAgeHours <= maximumBackupAge ? "pass" : "fail",
      });
      checks.push({
        name: "restore-rehearsal",
        status: rehearsalAgeHours !== null && rehearsalAgeHours <= maximumRehearsalAge ? "pass" : "fail",
      });
    }
  } else {
    checks.push({ name: "backup-freshness", status: "warn" });
    checks.push({ name: "restore-rehearsal", status: "warn" });
  }

  if (databaseAvailable && productionLike) {
    try {
      const requirements = parseHeartbeatRequirements();
      const jobKeys = Object.keys(requirements);
      const heartbeats = await prisma.operationalJobHeartbeat.findMany({
        where: { jobKey: { in: jobKeys } },
        select: { jobKey: true, lastSucceededAt: true, lastFailedAt: true },
      });
      const byJobKey = new Map(heartbeats.map((heartbeat) => [heartbeat.jobKey, heartbeat]));
      const failed = Object.entries(requirements).some(([jobKey, maxAgeMinutes]) => {
        return evaluateHeartbeatFreshness(byJobKey.get(jobKey), maxAgeMinutes, now).status === "fail";
      });
      checks.push({ name: "scheduled-jobs", status: failed ? "fail" : "pass" });
    } catch {
      checks.push({ name: "scheduled-jobs", status: "fail" });
    }
  } else {
    checks.push({ name: "scheduled-jobs", status: productionLike ? "fail" : "warn" });
  }

  return {
    ready: checks.every((check) => check.status !== "fail"),
    checks,
  };
}
