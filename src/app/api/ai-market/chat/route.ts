import { NextResponse } from "next/server";
import {
  buildInstitutionalOpenAiRequest,
  ensureInstitutionalChatDisclosure,
  ensureInstitutionalResearchCoverageNotice,
  enforceVipInvestmentEvidence,
  extractInstitutionalChatResult,
  requiresVipWebResearch,
  type InstitutionalChatCitation,
  type InstitutionalChatResult,
} from "@/lib/ai-market/institutional-chat-policy";
import { createOpenAiRequestBudget } from "@/lib/ai-market/chat-request-control";
import {
  buildContextFromMarketItems,
  buildLocalMarketChatAnswer,
  buildMarketChatContextText,
  getMarketChatSources,
  selectMarketChatAgentPerformance,
  type MarketChatLocale,
} from "@/lib/ai-market/market-chat";
import { getSessionUser } from "@/lib/auth";
import {
  DailyAiQueryLimitReachedError,
  getAiQueryQuota,
  reserveAiQuery,
} from "@/lib/ai-query-quota";
import type { AiQueryQuota } from "@/lib/ai-query-policy";
import { consumeVoiceAiQueryReservation } from "@/lib/ai-query-reservation";
import { getEconomyHeadlines } from "@/lib/economy-news";
import { getLiveMarketItems } from "@/lib/live-market";
import { getMembershipSnapshot } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { decimalToNumber, nullableDecimalToNumber } from "@/lib/decimal";
import { FixedWindowRateLimiter, getRateLimitClientKey } from "@/lib/request-rate-limit";
import { getVipAgentSummaries } from "@/lib/vip-agents/dashboard";
import { recordSiteAnalyticsEvent, siteAnalyticsEvents } from "@/lib/analytics";

export const dynamic = "force-dynamic";

type ChatMessage = {
  role?: unknown;
  content?: unknown;
};

type ChatRequestBody = {
  message?: unknown;
  locale?: unknown;
  history?: unknown;
  voiceReservation?: unknown;
};

const rateLimiter = new FixedWindowRateLimiter({
  windowMs: 60_000,
  maxRequests: 18,
  maxEntries: 10_000,
});
const MAX_CHAT_REPORT_AGE_MS = 36 * 60 * 60 * 1000;

function isCurrentReport(date: Date) {
  const age = Date.now() - date.getTime();
  return age >= -5 * 60 * 1000 && age <= MAX_CHAT_REPORT_AGE_MS;
}

function normalizeLocale(value: unknown): MarketChatLocale {
  return value === "en" ? "en" : "tr";
}

function getAuthenticationError(locale: MarketChatLocale) {
  return locale === "tr"
    ? "AI sorgusu göndermek için hesabınıza giriş yapın."
    : "Sign in to your account to send an AI query.";
}

function getQuotaLimitError(locale: MarketChatLocale, isPaidVipActive: boolean) {
  if (locale === "en") {
    return isPaidVipActive
      ? "You have used today's 15 AI queries. Your allowance resets at midnight Istanbul time."
      : "You have used today's 10 free AI queries. Your allowance resets at midnight Istanbul time. Upgrade with the 100 TL VIP payment for 15 daily queries.";
  }

  return isPaidVipActive
    ? "Bugünkü 15 AI sorgu hakkınızı kullandınız. Hakkınız İstanbul saatiyle gece 00.00'da yenilenir."
    : "Bugünkü 10 ücretsiz AI sorgu hakkınızı kullandınız. Hakkınız İstanbul saatiyle gece 00.00'da yenilenir. Günlük 15 sorgu için 100 TL VIP ödemesine geçebilirsiniz.";
}

function getQueryUpgradeUrl(locale: MarketChatLocale) {
  return `/${locale}/vip?upgrade=queries#ai-query-upgrade`;
}

function getQuotaLimitResponse(locale: MarketChatLocale, quota: AiQueryQuota) {
  return NextResponse.json(
    {
      error: getQuotaLimitError(locale, quota.isPaidVipActive),
      code: "DAILY_QUERY_LIMIT_REACHED",
      quota,
      upgradeUrl: quota.isPaidVipActive ? null : getQueryUpgradeUrl(locale),
    },
    { status: 429, headers: { "Cache-Control": "private, no-store" } },
  );
}

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 700);
}

function normalizeVoiceReservation(value: unknown) {
  return typeof value === "string" && value.length <= 128 ? value.trim() : "";
}

function normalizeHistory(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((message): { role: "user" | "assistant"; content: string } | null => {
      const entry = message as ChatMessage;
      const role = entry.role === "assistant" ? "assistant" : entry.role === "user" ? "user" : null;
      const content = normalizeMessage(entry.content);

      return role && content ? { role, content } : null;
    })
    .filter((message): message is { role: "user" | "assistant"; content: string } => Boolean(message))
    .slice(-6);
}

function toStringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, 24) : [];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function finiteNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function summarizeIndicatorSnapshot(sourcePayload: unknown) {
  const payload = asRecord(sourcePayload);
  const indicators = asRecord(payload?.indicators);

  if (!indicators) {
    return null;
  }

  const macd = asRecord(indicators.macd);
  const volumeAnomaly = asRecord(indicators.volumeAnomaly);
  const indicatorValues: Array<[string, number | null]> = [
    ["EMA20", finiteNumber(indicators.ema20)],
    ["EMA50", finiteNumber(indicators.ema50)],
    ["EMA200", finiteNumber(indicators.ema200)],
    ["RSI", finiteNumber(indicators.rsi)],
    ["MACD", finiteNumber(macd?.macd)],
    ["MACD signal", finiteNumber(macd?.signal)],
    ["MACD histogram", finiteNumber(macd?.histogram)],
    ["ATR", finiteNumber(indicators.atr)],
    ["volume ratio", finiteNumber(volumeAnomaly?.ratio)],
  ];
  const values = indicatorValues.filter((entry): entry is [string, number] => entry[1] !== null);

  return values.length > 0
    ? values.map(([label, value]) => `${label}=${Math.round(value * 10_000) / 10_000}`).join(", ")
    : null;
}

function summarizeReportSource(sourcePayload: unknown) {
  const payload = asRecord(sourcePayload);

  return {
    provider: typeof payload?.provider === "string" ? payload.provider : null,
    sourceAsOf: typeof payload?.sourceAsOf === "string" ? payload.sourceAsOf : null,
    dataStatus: typeof payload?.dataStatus === "string" ? payload.dataStatus : "unknown",
  };
}

async function getLatestReport() {
  const report = await prisma.aiMarketReport.findFirst({
    where: { scope: "GLOBAL" },
    orderBy: { generatedAt: "desc" },
    select: {
      generatedAt: true,
      marketRegime: true,
      riskAppetite: true,
      macroSummary: true,
      newsSummary: true,
      keyTakeaways: true,
      assets: {
        orderBy: [{ opportunityScore: "desc" }, { symbol: "asc" }],
        take: 24,
        select: {
          symbol: true,
          displayName: true,
          assetClass: true,
          lastPrice: true,
          changePercent: true,
          signalType: true,
          confidence: true,
          riskScore: true,
          opportunityScore: true,
          technicalCommentary: true,
          macroCommentary: true,
          newsCommentary: true,
          watchLevels: true,
          scenarios: true,
          sourcePayload: true,
        },
      },
    },
  });

  return report && isCurrentReport(report.generatedAt)
    ? {
        generatedAt: report.generatedAt.toISOString(),
        marketRegime: report.marketRegime,
        riskAppetite: report.riskAppetite,
        macroSummary: report.macroSummary,
        newsSummary: report.newsSummary,
        keyTakeaways: toStringArray(report.keyTakeaways),
        assets: report.assets.map((asset) => {
          const source = summarizeReportSource(asset.sourcePayload);

          return {
            symbol: asset.symbol,
            displayName: asset.displayName,
            assetClass: asset.assetClass,
            lastPrice: nullableDecimalToNumber(asset.lastPrice),
            changePercent: nullableDecimalToNumber(asset.changePercent),
            signalType: asset.signalType,
            confidence: asset.confidence,
            riskScore: asset.riskScore,
            opportunityScore: asset.opportunityScore,
            technicalCommentary: asset.technicalCommentary,
            macroCommentary: asset.macroCommentary,
            newsCommentary: asset.newsCommentary,
            watchLevels: toStringArray(asset.watchLevels),
            scenarios: toStringArray(asset.scenarios),
            indicatorSnapshot: summarizeIndicatorSnapshot(asset.sourcePayload),
            ...source,
          };
        }),
      }
    : null;
}

async function getLatestVipResearch() {
  const report = await prisma.vipResearchReport.findFirst({
    where: { status: "COMPLETED" },
    orderBy: { generatedAt: "desc" },
    select: {
      generatedAt: true,
      marketContext: true,
      executiveSummary: true,
      fallbackUsed: true,
      ideas: {
        orderBy: { rank: "asc" },
        take: 8,
        select: {
          symbol: true,
          displayName: true,
          assetClass: true,
          rank: true,
          stance: true,
          thesisSummary: true,
          negativeCase: true,
          macroThesis: true,
          fundamentalThesis: true,
          technicalThesis: true,
          catalysts: true,
          exitPlan: true,
          institutionalPerception: true,
          shortInterestCommentary: true,
          confidenceScore: true,
          riskScore: true,
          priceAtRecommendation: true,
          entryLow: true,
          entryHigh: true,
          stopLoss: true,
          targetPrice: true,
          secondaryTargetPrice: true,
        },
      },
    },
  });

  return report && isCurrentReport(report.generatedAt)
    ? {
        generatedAt: report.generatedAt.toISOString(),
        marketContext: report.marketContext,
        executiveSummary: report.executiveSummary,
        fallbackUsed: report.fallbackUsed,
        ideas: report.ideas.map((idea) => ({
          ...idea,
          priceAtRecommendation: decimalToNumber(idea.priceAtRecommendation),
          entryLow: decimalToNumber(idea.entryLow),
          entryHigh: decimalToNumber(idea.entryHigh),
          stopLoss: decimalToNumber(idea.stopLoss),
          targetPrice: decimalToNumber(idea.targetPrice),
          secondaryTargetPrice: nullableDecimalToNumber(idea.secondaryTargetPrice),
          catalysts: toStringArray(idea.catalysts),
        })),
      }
    : undefined;
}

async function askOpenAi({
  question,
  contextText,
  history,
  locale,
  isVip,
  requestSignal,
}: {
  question: string;
  contextText: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  locale: MarketChatLocale;
  isVip: boolean;
  requestSignal: AbortSignal;
}): Promise<InstitutionalChatResult | null> {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    console.error("[ai-market-chat] OPENAI_API_KEY is not configured");
    return null;
  }

  const model = isVip
    ? (process.env.OPENAI_VIP_MARKET_CHAT_MODEL || "gpt-4.1")
    : (process.env.OPENAI_MARKET_CHAT_MODEL || "gpt-4.1-mini");
  const requestBody = buildInstitutionalOpenAiRequest({
    model,
    question,
    contextText,
    history,
    locale,
    tier: isVip ? "VIP" : "STANDARD",
  });
  const retryableStatuses = new Set([429, 500, 502, 503, 504]);
  const requestBudget = createOpenAiRequestBudget(isVip ? "VIP" : "STANDARD");

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const remainingMs = requestBudget.remainingMs();

    if (remainingMs <= 0 || requestSignal.aborted) {
      return null;
    }

    try {
      const timeoutSignal = AbortSignal.timeout(remainingMs);
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.any([requestSignal, timeoutSignal]),
      });

      if (response.ok) {
        return extractInstitutionalChatResult(await response.json());
      }

      let errorDetails: { error?: { type?: unknown; code?: unknown; param?: unknown } } = {};

      try {
        errorDetails = await response.json() as typeof errorDetails;
      } catch {
        errorDetails = {};
      }

      console.error("[ai-market-chat] OpenAI request failed", {
        status: response.status,
        type: errorDetails.error?.type,
        code: errorDetails.error?.code,
        param: errorDetails.error?.param,
        requestId: response.headers.get("x-request-id"),
      });

      if (!retryableStatuses.has(response.status) || attempt === 1) {
        return null;
      }
    } catch (error) {
      console.error("[ai-market-chat] OpenAI request error", {
        name: error instanceof Error ? error.name : "UnknownError",
        message: error instanceof Error ? error.message : "Unknown request error",
      });
      if (attempt === 1 || requestSignal.aborted) {
        return null;
      }
    }
  }

  return null;
}

async function getAuthenticatedUserMembership() {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return null;
  }

  const fullUser = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: { createdAt: true, membershipTier: true, vipPaidUntil: true },
  });

  return fullUser
    ? { sessionUser, membership: getMembershipSnapshot(fullUser) }
    : null;
}

export async function GET(request: Request) {
  const locale = normalizeLocale(new URL(request.url).searchParams.get("locale"));

  try {
    const authenticated = await getAuthenticatedUserMembership();

    if (!authenticated) {
      return NextResponse.json(
        { error: getAuthenticationError(locale), code: "AUTH_REQUIRED" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const quota = await getAiQueryQuota({
      userId: authenticated.sessionUser.id,
      isPaidVipActive: authenticated.membership.isPaidVipActive,
    });

    return NextResponse.json(
      {
        membership: authenticated.membership.effectiveTier,
        quota,
        upgradeUrl: quota.isPaidVipActive ? null : getQueryUpgradeUrl(locale),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: locale === "tr" ? "AI sorgu kotası alınamadı." : "AI query quota could not be loaded." },
      { status: 500, headers: { "Cache-Control": "private, no-store" } },
    );
  }
}

export async function POST(request: Request) {
  try {
    const clientKey = getRateLimitClientKey(request.headers);

    if (rateLimiter.isRateLimited(clientKey)) {
      return NextResponse.json({ error: "Çok sık soru soruldu. Lütfen biraz sonra tekrar deneyin." }, { status: 429 });
    }

    let body: ChatRequestBody;

    try {
      body = await request.json() as ChatRequestBody;
    } catch {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const locale = normalizeLocale(body.locale);
    const question = normalizeMessage(body.message);
    const history = normalizeHistory(body.history);
    const voiceReservation = normalizeVoiceReservation(body.voiceReservation);

    if (!question) {
      return NextResponse.json({ error: locale === "tr" ? "Lütfen bir soru yazın." : "Please enter a question." }, { status: 400 });
    }

    const authenticated = await getAuthenticatedUserMembership();

    if (!authenticated) {
      return NextResponse.json(
        { error: getAuthenticationError(locale), code: "AUTH_REQUIRED" },
        { status: 401, headers: { "Cache-Control": "private, no-store" } },
      );
    }

    const { sessionUser, membership } = authenticated;
    const usedVoiceReservation = voiceReservation
      ? await consumeVoiceAiQueryReservation({
          token: voiceReservation,
          userId: sessionUser.id,
        })
      : false;

    if (!usedVoiceReservation) {
      const preflightQuota = await getAiQueryQuota({
        userId: sessionUser.id,
        isPaidVipActive: membership.isPaidVipActive,
      });

      if (preflightQuota.remaining <= 0) {
        return getQuotaLimitResponse(locale, preflightQuota);
      }
    }

    const isVip = membership.isVipActive;
    const tier = isVip ? "VIP" as const : "STANDARD" as const;
    const [items, latestReport, vipResearch, agentSummaries, economyHeadlines] = await Promise.all([
      getLiveMarketItems(),
      getLatestReport(),
      isVip ? getLatestVipResearch() : Promise.resolve(undefined),
      getVipAgentSummaries().catch(() => []),
      isVip ? getEconomyHeadlines(8, locale) : Promise.resolve([]),
    ]);
    const agentPerformance = selectMarketChatAgentPerformance(agentSummaries, tier);
    const vipNews = isVip
      ? economyHeadlines.map((headline, index) => ({
          ...headline,
          category: "economy",
          relevance: Math.max(0.1, 1 - index * 0.08),
        }))
      : undefined;
    const context = buildContextFromMarketItems(question, items, latestReport, vipNews, vipResearch, tier, agentPerformance);
    const fallbackAnswer = ensureInstitutionalChatDisclosure(buildLocalMarketChatAnswer(question, context, locale), locale);
    const contextText = buildMarketChatContextText(context, locale);
    const vipWebResearchRequired = isVip && requiresVipWebResearch(question);

    let answer = fallbackAnswer;
    let mode: "openai" | "local" = "local";
    let citations: InstitutionalChatCitation[] = [];
    let researched = false;
    let researchCoverage: InstitutionalChatResult["researchCoverage"] = "none";

    try {
      const aiResult = await askOpenAi({ question, contextText, history, locale, isVip, requestSignal: request.signal });

      const hasRequiredVipEvidence = !vipWebResearchRequired ||
        Boolean(aiResult?.webSearchUsed && aiResult.citations.length > 0);

      if (aiResult && hasRequiredVipEvidence) {
        const evidenceEnforcement = isVip
          ? enforceVipInvestmentEvidence(aiResult, locale, contextText)
          : { answer: aiResult.answer, accepted: true };
        const coverageAwareAnswer = vipWebResearchRequired
          ? ensureInstitutionalResearchCoverageNotice(
              evidenceEnforcement.answer,
              locale,
              evidenceEnforcement.accepted ? aiResult.researchCoverage : "partial",
            )
          : evidenceEnforcement.answer;
        answer = ensureInstitutionalChatDisclosure(coverageAwareAnswer, locale);
        citations = aiResult.citations;
        researched = aiResult.researched && evidenceEnforcement.accepted;
        researchCoverage = evidenceEnforcement.accepted ? aiResult.researchCoverage : "partial";
        mode = "openai";
      }
    } catch {
      answer = fallbackAnswer;
    }

    const sources = getMarketChatSources(context, locale);

    if (citations.length > 0) {
      sources.push({
        label: locale === "tr" ? "Canlı web araştırması" : "Live web research",
        value: locale === "tr"
          ? `${citations.length} kaynak bağlantısı · ${researchCoverage === "substantial" ? "geniş kapsam" : "kısmi kapsam"}`
          : `${citations.length} source links · ${researchCoverage === "substantial" ? "substantial coverage" : "partial coverage"}`,
      });
    }

    let quota: AiQueryQuota;

    try {
      quota = usedVoiceReservation
        ? await getAiQueryQuota({
            userId: sessionUser.id,
            isPaidVipActive: membership.isPaidVipActive,
          })
        : await reserveAiQuery({
            userId: sessionUser.id,
            isPaidVipActive: membership.isPaidVipActive,
          });
    } catch (error) {
      if (error instanceof DailyAiQueryLimitReachedError) {
        return getQuotaLimitResponse(locale, error.quota);
      }

      throw error;
    }

    await recordSiteAnalyticsEvent({
      eventType: siteAnalyticsEvents.aiChat,
      userId: sessionUser.id,
      sessionKey: clientKey,
      locale,
      path: `/${locale}/ai-piyasa-asistani`,
      request: { headers: request.headers },
      metadata: {
        mode,
        membership: isVip ? "VIP" : "STANDARD",
        questionLength: question.length,
        historyLength: history.length,
        sourcesCount: sources.length,
        citationCount: citations.length,
        researchStatus: isVip
          ? researched ? "completed" : citations.length > 0 ? "partial" : "unavailable"
          : "site_only",
        researchCoverage,
        dailyQueryLimit: quota.limit,
        dailyQueryUsed: quota.used,
        voiceReservationUsed: usedVoiceReservation,
      },
    }).catch((error) => {
      console.error("[ai-market-chat] Analytics recording failed", {
        name: error instanceof Error ? error.name : "UnknownError",
      });
    });

    return NextResponse.json(
      {
        answer,
        mode,
        membership: isVip ? "VIP" : "STANDARD",
        updatedAt: context.updatedAt,
        sources,
        citations,
        researchStatus: isVip
          ? researched ? "completed" : citations.length > 0 ? "partial" : "unavailable"
          : "site_only",
        researchCoverage,
        quota,
        upgradeUrl: quota.isPaidVipActive ? null : getQueryUpgradeUrl(locale),
      },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "production"
          ? "AI sohbet yanıtı hazırlanamadı."
          : error instanceof Error ? error.message : "AI sohbet yanıtı hazırlanamadı.",
      },
      { status: 500 },
    );
  }
}
