import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const siteAnalyticsEvents = {
  register: "REGISTER",
  leagueJoin: "LEAGUE_JOIN",
  firstTrade: "FIRST_TRADE",
  aiChat: "AI_CHAT",
  macroReportOpen: "MACRO_REPORT_OPEN",
} as const;

export type SiteAnalyticsEventType = (typeof siteAnalyticsEvents)[keyof typeof siteAnalyticsEvents];

type AnalyticsRequestContext = {
  headers?: Headers;
  referrer?: string | null;
  userAgent?: string | null;
};

type RecordSiteAnalyticsEventInput = {
  eventType: SiteAnalyticsEventType;
  userId?: string | null;
  sessionKey?: string | null;
  locale?: string | null;
  path?: string | null;
  metadata?: Record<string, unknown> | null;
  request?: AnalyticsRequestContext | null;
};

function readHeader(request: AnalyticsRequestContext | null | undefined, name: string) {
  return request?.headers?.get(name) ?? null;
}

function trimNullable(value: string | null | undefined, maxLength: number) {
  const normalized = value?.replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, maxLength) : null;
}

export async function recordSiteAnalyticsEvent({
  eventType,
  userId,
  sessionKey,
  locale,
  path,
  metadata,
  request,
}: RecordSiteAnalyticsEventInput) {
  const referrer = request?.referrer ?? readHeader(request, "referer");
  const userAgent = request?.userAgent ?? readHeader(request, "user-agent");

  try {
    await prisma.siteAnalyticsEvent.create({
      data: {
        eventType,
        userId: userId ?? null,
        sessionKey: trimNullable(sessionKey, 120),
        locale: trimNullable(locale, 12),
        path: trimNullable(path, 500),
        referrer: trimNullable(referrer, 500),
        userAgent: trimNullable(userAgent, 500),
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.warn("Site analytics event could not be recorded", {
      eventType,
      userId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
