import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaSchemaVersion?: string;
};

const prismaSchemaVersion = "20260618211500_add_ai_market_agent_reports";

function getDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;

  return databaseUrl ?? "file:./dev.db";
}

const adapter = new PrismaBetterSqlite3({
  url: getDatabaseUrl(),
});

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
      candidate?.aiMarketReportNewsItem,
  );
}

export const prisma = hasCurrentDelegates(globalForPrisma.prisma)
  ? globalForPrisma.prisma!
  : new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaSchemaVersion = prismaSchemaVersion;
}
