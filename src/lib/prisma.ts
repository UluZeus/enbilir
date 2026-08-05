import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const prismaSchemaVersion = "20260804000000_mysql_baseline";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl && process.env.NODE_ENV === "test") {
    // Unit tests mock Prisma delegates. This local-only pool config prevents imports
    // from requiring credentials while still making accidental queries fail closed.
    return {
      host: "127.0.0.1",
      port: 3306,
      user: "enbilir_test",
      database: "enbilir_test",
      connectionLimit: 1,
      connectTimeout: 1_000,
      acquireTimeout: 1_000,
    };
  }

  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be configured for the MySQL runtime.");
  }

  if (!databaseUrl.startsWith("mysql://") && !databaseUrl.startsWith("mariadb://")) {
    throw new Error("DATABASE_URL must use the mysql:// or mariadb:// protocol.");
  }

  return databaseUrl;
}

const adapter = new PrismaMariaDb(getDatabaseUrl());

function hasCurrentDelegates(client: PrismaClient | undefined) {
  const candidate = client as unknown as {
    virtualAccount?: unknown;
    portfolioPosition?: unknown;
    virtualTrade?: unknown;
    managedContentPage?: unknown;
    managedContentItem?: unknown;
    friendRequest?: unknown;
    league?: unknown;
    leagueMembership?: unknown;
    badge?: unknown;
    userBadge?: unknown;
    achievementEvent?: unknown;
    competitionPeriod?: unknown;
    portfolioSnapshot?: unknown;
    siteVisualSetting?: unknown;
    oAuthAccount?: unknown;
    aiSignalLog?: unknown;
    aiSignalEvaluation?: unknown;
    aiMarketFavorite?: unknown;
    aiMarketReport?: unknown;
    aiMarketReportAsset?: unknown;
    aiMarketReportNewsItem?: unknown;
    aiMarketReportEvent?: unknown;
    subscriptionEmailLog?: unknown;
    chatRoom?: unknown;
    chatMessage?: unknown;
    chatPresence?: unknown;
    chatPollOption?: unknown;
    chatPollVote?: unknown;
    weeklyPortfolioBaseline?: unknown;
    weeklyCompetitionPublication?: unknown;
    weeklyCompetitionResultRow?: unknown;
    chatMessageReport?: unknown;
    chatUserBlock?: unknown;
    siteAnalyticsEvent?: unknown;
    vipResearchReport?: unknown;
    vipResearchIdea?: unknown;
    vipResearchIdeaEvaluation?: unknown;
    vipResearchEmailLog?: unknown;
    vipSubscriptionPayment?: unknown;
    vipSubscriptionClaim?: unknown;
    vipTradingAgent?: unknown;
    vipTradingAgentPosition?: unknown;
    vipTradingAgentTrade?: unknown;
    vipTradingAgentDecision?: unknown;
    vipTradingAgentSnapshot?: unknown;
    aiDailyQueryUsage?: unknown;
    aiQueryReservation?: unknown;
    auditEvent?: unknown;
    auditChainHead?: unknown;
    operationalJobHeartbeat?: unknown;
    chatUpload?: unknown;
    supportReminderPeriod?: unknown;
    supportReminderEntry?: unknown;
  };

  return Boolean(
    globalForPrisma.prismaSchemaVersion === prismaSchemaVersion &&
      candidate?.virtualAccount &&
      candidate?.portfolioPosition &&
      candidate?.virtualTrade &&
      candidate?.managedContentPage &&
      candidate?.managedContentItem &&
      candidate?.friendRequest &&
      candidate?.league &&
      candidate?.leagueMembership &&
      candidate?.badge &&
      candidate?.userBadge &&
      candidate?.achievementEvent &&
      candidate?.competitionPeriod &&
      candidate?.portfolioSnapshot &&
      candidate?.siteVisualSetting &&
      candidate?.oAuthAccount &&
      candidate?.aiSignalLog &&
      candidate?.aiSignalEvaluation &&
      candidate?.aiMarketFavorite &&
      candidate?.aiMarketReport &&
      candidate?.aiMarketReportAsset &&
      candidate?.aiMarketReportNewsItem &&
      candidate?.aiMarketReportEvent &&
      candidate?.subscriptionEmailLog &&
      candidate?.chatRoom &&
      candidate?.chatMessage &&
      candidate?.chatPresence &&
      candidate?.chatPollOption &&
      candidate?.chatPollVote &&
      candidate?.weeklyPortfolioBaseline &&
      candidate?.weeklyCompetitionPublication &&
      candidate?.weeklyCompetitionResultRow &&
      candidate?.chatMessageReport &&
      candidate?.chatUserBlock &&
      candidate?.siteAnalyticsEvent &&
      candidate?.vipResearchReport &&
      candidate?.vipResearchIdea &&
      candidate?.vipResearchIdeaEvaluation &&
      candidate?.vipResearchEmailLog &&
      candidate?.vipSubscriptionPayment &&
      candidate?.vipSubscriptionClaim &&
      candidate?.vipTradingAgent &&
      candidate?.vipTradingAgentPosition &&
      candidate?.vipTradingAgentTrade &&
      candidate?.vipTradingAgentDecision &&
      candidate?.vipTradingAgentSnapshot &&
      candidate?.aiDailyQueryUsage &&
      candidate?.aiQueryReservation &&
      candidate?.auditEvent &&
      candidate?.auditChainHead &&
      candidate?.operationalJobHeartbeat &&
      candidate?.chatUpload &&
      candidate?.supportReminderPeriod &&
      candidate?.supportReminderEntry
  );
}

export const prisma = hasCurrentDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma!
  : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = prismaSchemaVersion;
}
