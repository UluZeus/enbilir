import { NextResponse } from "next/server";
import {
  buildInstitutionalOpenAiRequest,
  ensureInstitutionalChatDisclosure,
  extractInstitutionalChatResult,
  type InstitutionalChatCitation,
  type InstitutionalChatResult,
} from "@/lib/ai-market/institutional-chat-policy";
import {
  buildContextFromMarketItems,
  buildLocalMarketChatAnswer,
  buildMarketChatContextText,
  getMarketChatSources,
  selectMarketChatAgentPerformance,
  type MarketChatLocale,
} from "@/lib/ai-market/market-chat";
import { getSessionUser } from "@/lib/auth";
import { getLiveMarketItems } from "@/lib/live-market";
import { getMembershipSnapshot } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
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
};

const rateLimiter = new FixedWindowRateLimiter({
  windowMs: 60_000,
  maxRequests: 18,
  maxEntries: 10_000,
});

function normalizeLocale(value: unknown): MarketChatLocale {
  return value === "en" ? "en" : "tr";
}

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 700);
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

  return report
    ? {
        generatedAt: report.generatedAt.toISOString(),
        marketRegime: report.marketRegime,
        riskAppetite: report.riskAppetite,
        macroSummary: report.macroSummary,
        newsSummary: report.newsSummary,
        keyTakeaways: toStringArray(report.keyTakeaways),
        assets: report.assets.map((asset) => ({
          symbol: asset.symbol,
          displayName: asset.displayName,
          assetClass: asset.assetClass,
          lastPrice: asset.lastPrice,
          changePercent: asset.changePercent,
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
        })),
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

  return report
    ? {
        generatedAt: report.generatedAt.toISOString(),
        marketContext: report.marketContext,
        executiveSummary: report.executiveSummary,
        fallbackUsed: report.fallbackUsed,
        ideas: report.ideas.map((idea) => ({
          ...idea,
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

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const timeoutSignal = AbortSignal.timeout(isVip ? 95_000 : 45_000);
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

    if (!question) {
      return NextResponse.json({ error: locale === "tr" ? "Lütfen bir soru yazın." : "Please enter a question." }, { status: 400 });
    }

    const sessionUser = await getSessionUser();
    const fullUser = sessionUser
      ? await prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: { createdAt: true, membershipTier: true, vipPaidUntil: true },
        })
      : null;
    const membership = fullUser ? getMembershipSnapshot(fullUser) : null;
    const isVip = Boolean(membership?.isVipActive);
    const tier = isVip ? "VIP" as const : "STANDARD" as const;
    const [items, latestReport, vipResearch, agentSummaries] = await Promise.all([
      getLiveMarketItems(),
      getLatestReport(),
      isVip ? getLatestVipResearch() : Promise.resolve(undefined),
      getVipAgentSummaries().catch(() => []),
    ]);
    const agentPerformance = selectMarketChatAgentPerformance(agentSummaries, tier);
    const context = buildContextFromMarketItems(question, items, latestReport, undefined, vipResearch, tier, agentPerformance);
    const fallbackAnswer = ensureInstitutionalChatDisclosure(buildLocalMarketChatAnswer(question, context, locale), locale);
    const contextText = buildMarketChatContextText(context, locale);

    let answer = fallbackAnswer;
    let mode: "openai" | "local" = "local";
    let citations: InstitutionalChatCitation[] = [];
    let researched = false;

    try {
      const aiResult = await askOpenAi({ question, contextText, history, locale, isVip, requestSignal: request.signal });

      const hasRequiredVipEvidence = !isVip || Boolean(aiResult?.researched && aiResult.citations.length > 0);

      if (aiResult && hasRequiredVipEvidence) {
        answer = ensureInstitutionalChatDisclosure(aiResult.answer, locale);
        citations = aiResult.citations;
        researched = aiResult.researched;
        mode = "openai";
      }
    } catch {
      answer = fallbackAnswer;
    }

    const sources = getMarketChatSources(context, locale);

    if (researched) {
      sources.push({
        label: locale === "tr" ? "Canlı web araştırması" : "Live web research",
        value: locale === "tr" ? `${citations.length} kaynak bağlantısı` : `${citations.length} source links`,
      });
    }

    await recordSiteAnalyticsEvent({
      eventType: siteAnalyticsEvents.aiChat,
      userId: sessionUser?.id,
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
        researchStatus: isVip ? (researched ? "completed" : "unavailable") : "site_only",
      },
    });

    return NextResponse.json(
      {
        answer,
        mode,
        membership: isVip ? "VIP" : "STANDARD",
        updatedAt: context.updatedAt,
        sources,
        citations,
        researchStatus: isVip ? (researched ? "completed" : "unavailable") : "site_only",
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
