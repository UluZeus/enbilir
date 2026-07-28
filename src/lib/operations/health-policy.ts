export type AppliedMigration = {
  migrationName: string;
  finishedAt: Date | null;
  rolledBackAt: Date | null;
};

export type JobHeartbeat = {
  lastSucceededAt: Date | null;
  lastFailedAt: Date | null;
};

export function getMissingMigrations(expected: string[], applied: AppliedMigration[]) {
  const successful = new Set(
    applied
      .filter((migration) => migration.finishedAt && !migration.rolledBackAt)
      .map((migration) => migration.migrationName),
  );
  return expected.filter((migrationName) => !successful.has(migrationName));
}

export function evaluateHeartbeatFreshness(
  heartbeat: JobHeartbeat | undefined,
  maxAgeMinutes: number,
  now = new Date(),
): { status: "pass" | "fail"; ageMinutes: number | null } {
  if (!heartbeat?.lastSucceededAt) {
    return { status: "fail", ageMinutes: null };
  }

  if (heartbeat.lastFailedAt && heartbeat.lastFailedAt > heartbeat.lastSucceededAt) {
    return {
      status: "fail",
      ageMinutes: Math.max(0, (now.getTime() - heartbeat.lastSucceededAt.getTime()) / 60_000),
    };
  }

  const ageMinutes = Math.max(0, (now.getTime() - heartbeat.lastSucceededAt.getTime()) / 60_000);
  return { status: ageMinutes <= maxAgeMinutes ? "pass" : "fail", ageMinutes };
}
