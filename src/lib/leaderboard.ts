import { getCompetitionRankingsForUser } from "@/lib/competition-periods";

export async function getUserRankingPeriods(userId: string) {
  return getCompetitionRankingsForUser(userId);
}
