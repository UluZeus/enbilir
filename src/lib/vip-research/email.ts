import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email";
import { getLiveMarketItems } from "@/lib/live-market";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildVipAgentDigest,
  buildVipUniversePulse,
  extractVipTechnicalCandidates,
  renderVipDailyDigest,
  type VipDigestIdea,
  type VipDigestMacroReport,
} from "@/lib/vip-research/daily-digest";

const EMAIL_DELIVERY_LEASE_MS = 30 * 60 * 1000;

function stringArray(value: Prisma.JsonValue): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

async function claimEmailDelivery(reportId: string, recipient: { id: string; email: string }) {
  const claimedAt = new Date();

  try {
    await prisma.vipResearchEmailLog.create({
      data: {
        reportId,
        userId: recipient.id,
        email: recipient.email,
        status: "SENDING",
        sentAt: claimedAt,
      },
    });
    return true;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  const staleBefore = new Date(claimedAt.getTime() - EMAIL_DELIVERY_LEASE_MS);
  const claimed = await prisma.vipResearchEmailLog.updateMany({
    where: {
      reportId,
      userId: recipient.id,
      OR: [
        { status: "FAILED" },
        { status: "SENDING", sentAt: { lt: staleBefore } },
      ],
    },
    data: {
      email: recipient.email,
      status: "SENDING",
      error: null,
      sentAt: claimedAt,
    },
  });

  return claimed.count === 1;
}

async function loadVipResearchEmailData(reportId: string) {
  const report = await prisma.vipResearchReport.findUnique({
    where: { id: reportId },
    include: { ideas: { orderBy: { rank: "asc" }, take: 5 } },
  });
  if (!report) {
    throw new Error("VIP raporu bulunamadı.");
  }

  const macroFreshAfter = new Date(report.generatedAt.getTime() - 36 * 60 * 60 * 1000);
  const [macroRecord, agentRecords, marketItems] = await Promise.all([
    prisma.aiMarketReport.findFirst({
      where: {
        scope: "GLOBAL",
        status: "COMPLETED",
        generatedAt: { gte: macroFreshAfter, lte: report.generatedAt },
      },
      orderBy: { generatedAt: "desc" },
      include: {
        newsItems: {
          orderBy: [{ relevance: "desc" }, { publishedAt: "desc" }],
          take: 10,
        },
      },
    }),
    prisma.vipTradingAgent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        slug: true,
        name: true,
        riskProfile: true,
        description: true,
        decisions: {
          where: { runKey: report.periodKey },
          select: { symbol: true, action: true, priceUsd: true, reason: true, sourceIdeaId: true },
        },
        positions: {
          select: { symbol: true, stopLossUsd: true, targetPriceUsd: true },
        },
        snapshots: {
          where: { periodKey: report.periodKey },
          select: { pnlUsd: true, returnPercent: true },
          take: 1,
        },
      },
    }),
    getLiveMarketItems().catch(() => []),
  ]);
  const ideas: VipDigestIdea[] = report.ideas.map((idea) => ({
    id: idea.id,
    symbol: idea.symbol,
    displayName: idea.displayName,
    currency: idea.currency,
    rank: idea.rank,
    stance: idea.stance,
    thesisSummary: idea.thesisSummary,
    confidenceScore: idea.confidenceScore,
    riskScore: idea.riskScore,
    entryLow: idea.entryLow,
    entryHigh: idea.entryHigh,
    stopLoss: idea.stopLoss,
    targetPrice: idea.targetPrice,
  }));
  const currentIdeaIds = new Set(ideas.map((idea) => idea.id));
  const historicalIdeaIds = Array.from(new Set(agentRecords.flatMap((agent) =>
    agent.decisions
      .map((decision) => decision.sourceIdeaId)
      .filter((ideaId): ideaId is string => typeof ideaId === "string" && !currentIdeaIds.has(ideaId)),
  )));
  const historicalAgentIdeaRecords = historicalIdeaIds.length > 0
    ? await prisma.vipResearchIdea.findMany({
        where: { id: { in: historicalIdeaIds } },
        select: {
          id: true,
          symbol: true,
          displayName: true,
          currency: true,
          rank: true,
          stance: true,
          thesisSummary: true,
          confidenceScore: true,
          riskScore: true,
          entryLow: true,
          entryHigh: true,
          stopLoss: true,
          targetPrice: true,
        },
      })
    : [];
  const agentIdeas: VipDigestIdea[] = [
    ...ideas,
    ...historicalAgentIdeaRecords,
  ];
  const universePulse = buildVipUniversePulse(
    marketItems.map((item) => ({
      symbol: item.symbol,
      name: item.name,
      category: item.category,
      source: item.source,
      dataStatus: item.dataStatus,
      priceUsd: item.priceUsd,
      changePercent: item.changePercent,
    })),
    extractVipTechnicalCandidates(report.sourceSnapshot),
  );
  const agentDigest = buildVipAgentDigest(agentRecords, agentIdeas);
  const macroReport: VipDigestMacroReport = macroRecord ? {
    id: macroRecord.id,
    generatedAt: macroRecord.generatedAt,
    macroSummary: macroRecord.macroSummary,
    marketRegime: macroRecord.marketRegime,
    riskAppetite: macroRecord.riskAppetite,
    keyTakeaways: stringArray(macroRecord.keyTakeaways),
    newsItems: macroRecord.newsItems,
  } : null;
  const siteUrl = getSiteUrl();
  const reportUrl = `${siteUrl}/tr/vip/raporlar/${report.id}`;
  const urls = {
    home: `${siteUrl}/tr/vip`,
    report: reportUrl,
    macroReport: macroReport ? `${siteUrl}/tr/ai-piyasa-asistani/raporlar/${macroReport.id}` : null,
    agents: `${siteUrl}/tr/vip/ajanlar`,
    agent: (slug: string) => `${siteUrl}/tr/vip/ajanlar/${encodeURIComponent(slug)}#karar-izi`,
    idea: (ideaId: string) => `${reportUrl}#idea-${encodeURIComponent(ideaId)}`,
    asset: (symbol: string) => `${siteUrl}/tr/islem-yap?symbol=${encodeURIComponent(symbol)}`,
  };

  return {
    report,
    ideas,
    macroReport,
    universePulse,
    agentDigest,
    urls,
  };
}

type VipResearchEmailData = Awaited<ReturnType<typeof loadVipResearchEmailData>>;

function renderVipResearchEmail(data: VipResearchEmailData, recipientName: string) {
  const { report, ideas, macroReport, universePulse, agentDigest, urls } = data;

  return renderVipDailyDigest({
    recipientName,
    report: {
      id: report.id,
      periodKey: report.periodKey,
      fallbackUsed: report.fallbackUsed,
      executiveSummary: report.executiveSummary,
      marketContext: report.marketContext,
      disclaimer: report.disclaimer,
      ideas,
    },
    macroReport,
    universePulse,
    agents: agentDigest,
    urls,
  });
}

export async function sendVipResearchEmails(reportId: string) {
  const now = new Date();
  const [emailData, recipients] = await Promise.all([
    loadVipResearchEmailData(reportId),
    prisma.user.findMany({
      where: { isActive: true, membershipTier: "VIP", vipPaidUntil: { gt: now } },
      select: { id: true, email: true, name: true },
    }),
  ]);
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    if (!await claimEmailDelivery(reportId, recipient)) {
      continue;
    }

    const digest = renderVipResearchEmail(emailData, recipient.name);

    try {
      await sendEmail({ to: recipient.email, subject: digest.subject, text: digest.text, html: digest.html });
      await prisma.vipResearchEmailLog.upsert({
        where: { reportId_userId: { reportId, userId: recipient.id } },
        create: { reportId, userId: recipient.id, email: recipient.email, status: "SENT" },
        update: { email: recipient.email, status: "SENT", error: null, sentAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      await prisma.vipResearchEmailLog.upsert({
        where: { reportId_userId: { reportId, userId: recipient.id } },
        create: { reportId, userId: recipient.id, email: recipient.email, status: "FAILED", error: error instanceof Error ? error.message : "E-posta gönderilemedi." },
        update: { status: "FAILED", error: error instanceof Error ? error.message : "E-posta gönderilemedi.", sentAt: new Date() },
      });
      failed += 1;
    }
  }

  return {
    recipients: recipients.length,
    sent,
    failed,
    universeSize: emailData.universePulse.universeSize,
    verifiedQuoteCount: emailData.universePulse.verifiedQuoteCount,
    alertCount: emailData.universePulse.totalAlertCount,
    agentCount: emailData.agentDigest.length,
  };
}

export async function sendVipResearchTestEmail(input: {
  to: string;
  name: string;
  reportId?: string;
}) {
  const reportId = input.reportId ?? (await prisma.vipResearchReport.findFirst({
    where: { status: "COMPLETED" },
    orderBy: { generatedAt: "desc" },
    select: { id: true },
  }))?.id;

  if (!reportId) {
    throw new Error("Test e-postası için tamamlanmış VIP raporu bulunamadı.");
  }

  const emailData = await loadVipResearchEmailData(reportId);
  const digest = renderVipResearchEmail(emailData, input.name);
  await sendEmail({
    to: input.to,
    subject: `[TEST] ${digest.subject}`,
    text: digest.text,
    html: digest.html,
  });

  return {
    sent: true as const,
    reportId,
    recipient: input.to,
    subject: `[TEST] ${digest.subject}`,
    agentCount: emailData.agentDigest.length,
    alertCount: emailData.universePulse.totalAlertCount,
  };
}
