export function getAiMarketReportAccessFilter(reportId: string, userId: string | null) {
  if (!userId) {
    return {
      id: reportId,
      scope: { in: ["GLOBAL", "WEEKLY"] },
    };
  }

  return {
    id: reportId,
    OR: [
      { userId },
      { scope: { in: ["GLOBAL", "WEEKLY"] } },
    ],
  };
}
