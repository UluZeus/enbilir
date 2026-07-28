export function partitionLeaderboardValuations<
  T extends { totalValueUsd: number; hasUnreliableValuation: boolean },
>(rows: T[]) {
  const rankedRows = rows
    .filter((row) => !row.hasUnreliableValuation)
    .sort((left, right) => right.totalValueUsd - left.totalValueUsd);
  const excludedRows = rows.filter((row) => row.hasUnreliableValuation);

  return { rankedRows, excludedRows };
}
