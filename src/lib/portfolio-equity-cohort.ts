export type PortfolioEquityCohortRecord = {
  userId: string;
  periodKey: string;
  portfolioValueUsd: number;
  capturedAt: Date;
};

export type PortfolioEquityCohort = {
  periodKey: string;
  capturedAt: Date;
  valueByUserId: Map<string, number>;
};

const equityHourPrefix = "equity-hour:";

function getEquityHourPeriodTime(periodKey: string) {
  const match = /^equity-hour:(\d{4})(\d{2})(\d{2})(\d{2})$/.exec(periodKey);
  if (!match) return null;

  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
  );
  const canonicalKey = `${equityHourPrefix}${new Date(timestamp).toISOString().slice(0, 13).replace(/[-T]/g, "")}`;
  return Number.isFinite(timestamp) && canonicalKey === periodKey ? timestamp : null;
}

export function selectLatestCommonPortfolioEquityCohort(
  userIds: string[],
  records: PortfolioEquityCohortRecord[],
  asOf: Date,
): PortfolioEquityCohort | null {
  const requiredUserIds = Array.from(new Set(userIds)).sort((left, right) => left.localeCompare(right));
  if (requiredUserIds.length === 0) return null;
  const requiredUserIdSet = new Set(requiredUserIds);
  const latestAllowedCaptureTime = asOf.getTime() + 60_000;

  const recordsByPeriodKey = new Map<string, Map<string, PortfolioEquityCohortRecord>>();
  for (const record of records) {
    const periodTime = typeof record.periodKey === "string"
      ? getEquityHourPeriodTime(record.periodKey)
      : null;
    if (
      periodTime === null
      || periodTime > latestAllowedCaptureTime
      || !requiredUserIdSet.has(record.userId)
      || !Number.isFinite(record.portfolioValueUsd)
      || record.portfolioValueUsd < 0
      || Number.isNaN(record.capturedAt.getTime())
      || record.capturedAt.getTime() > latestAllowedCaptureTime
    ) {
      continue;
    }

    const recordsByUserId = recordsByPeriodKey.get(record.periodKey) ?? new Map();
    recordsByUserId.set(record.userId, record);
    recordsByPeriodKey.set(record.periodKey, recordsByUserId);
  }

  const completeCohorts: PortfolioEquityCohort[] = [];
  for (const [periodKey, recordsByUserId] of recordsByPeriodKey) {
    const cohortRecords = requiredUserIds.map((userId) => recordsByUserId.get(userId));
    if (cohortRecords.some((record) => !record)) continue;

    // WeeklyPortfolioBaseline has no status column. These rows are written only
    // after the capture path has rejected unreliable portfolio valuations.
    const capturedTimes = new Set(cohortRecords.map((record) => record!.capturedAt.getTime()));
    if (capturedTimes.size !== 1) continue;

    completeCohorts.push({
      periodKey,
      capturedAt: cohortRecords[0]!.capturedAt,
      valueByUserId: new Map(cohortRecords.map((record) => [record!.userId, record!.portfolioValueUsd])),
    });
  }

  return completeCohorts.sort((left, right) => {
    const capturedOrder = right.capturedAt.getTime() - left.capturedAt.getTime();
    return capturedOrder !== 0 ? capturedOrder : right.periodKey.localeCompare(left.periodKey);
  })[0] ?? null;
}
