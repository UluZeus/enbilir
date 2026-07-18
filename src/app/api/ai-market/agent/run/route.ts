import { NextResponse } from "next/server";
import { sendMorningMacroReportEmails, sendWeeklyMacroReportEmails } from "@/lib/ai-market/agent/morning-report-email";
import { runAiMarketAgent } from "@/lib/ai-market/agent/report-agent";
import { captureActivePortfolioEquitySnapshots } from "@/lib/portfolio-history";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const REPORT_SCHEDULE_TIME_ZONE = "Europe/Istanbul";
const REPORT_SCHEDULE_MINUTE = 0;
const REPORT_SCHEDULE_HOURS = new Set([7, 12, 18]);
const REPORT_SCHEDULE_LABELS = ["07:00", "12:00", "18:00"];

function isAuthorized(request: Request) {
  const secret = process.env.AI_AGENT_CRON_SECRET;

  if (!secret && process.env.NODE_ENV !== "production") {
    return true;
  }

  return Boolean(secret && request.headers.get("x-ai-agent-secret") === secret);
}

function getIstanbulTimeParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: REPORT_SCHEDULE_TIME_ZONE,
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
  };
}

function isScheduledReportTime(date = new Date()) {
  const { hour, minute } = getIstanbulTimeParts(date);

  return minute === REPORT_SCHEDULE_MINUTE && REPORT_SCHEDULE_HOURS.has(hour);
}

function isMorningReportTime(date = new Date()) {
  const { hour, minute } = getIstanbulTimeParts(date);

  return hour === 7 && minute === REPORT_SCHEDULE_MINUTE;
}

function isMondayInIstanbul(date = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: REPORT_SCHEDULE_TIME_ZONE,
  }).format(date) === "Mon";
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Yetkisiz ajan tetikleme istegi." }, { status: 401 });
  }

  const triggeredAt = new Date();
  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";
  const portfolioEquityCapture = await captureActivePortfolioEquitySnapshots(triggeredAt).catch((error: unknown) => ({
    capturedAt: triggeredAt.toISOString(),
    eligibleUsers: 0,
    capturedUsers: 0,
    failedUsers: 0,
    error: error instanceof Error ? error.message : "Portföy geçmişi snapshot işlemi tamamlanamadı.",
  }));

  if (!force && !isScheduledReportTime(triggeredAt)) {
    const { hour, minute } = getIstanbulTimeParts(triggeredAt);

    return NextResponse.json({
      ranAt: triggeredAt.toISOString(),
      scheduled: false,
      message: "AI piyasa raporu yalnizca Turkiye saatiyle 07:00, 12:00 ve 18:00 zamanlarinda uretilir.",
      currentTurkeyTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      scheduleTurkeyTime: REPORT_SCHEDULE_LABELS,
      portfolioEquityCapture,
    });
  }

  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true },
    take: 20,
  });

  const globalReport = await runAiMarketAgent({ force });
  const userReports = await Promise.allSettled(users.map((user) => runAiMarketAgent({ userId: user.id, force })));
  let morningEmailResult: Awaited<ReturnType<typeof sendMorningMacroReportEmails>> | null = null;
  let weeklyReport: Awaited<ReturnType<typeof runAiMarketAgent>> | null = null;
  let weeklyEmailResult: Awaited<ReturnType<typeof sendWeeklyMacroReportEmails>> | null = null;

  if (isMorningReportTime(triggeredAt)) {
    const standardMorningRecipients = await prisma.user.findMany({
      where: {
        isActive: true,
        OR: [
          { membershipTier: "STANDARD" },
          { membershipTier: "VIP", vipPaidUntil: null },
          { membershipTier: "VIP", vipPaidUntil: { lte: triggeredAt } },
        ],
      },
      select: { id: true, email: true, name: true },
    });

    if (!globalReport.reused) {
      morningEmailResult = await sendMorningMacroReportEmails({
        reportId: globalReport.reportId,
        recipients: standardMorningRecipients,
      });
    }

    if (isMondayInIstanbul(triggeredAt)) {
      weeklyReport = await runAiMarketAgent({ force, reportMode: "WEEKLY" });

      if (!weeklyReport.reused) {
        const weeklyRecipients = await prisma.user.findMany({
          where: { isActive: true },
          select: { id: true, email: true, name: true },
        });
        weeklyEmailResult = await sendWeeklyMacroReportEmails({
          reportId: weeklyReport.reportId,
          recipients: weeklyRecipients,
        });
      }
    }
  }

  return NextResponse.json({
    ranAt: triggeredAt.toISOString(),
    scheduled: true,
    portfolioEquityCapture,
    globalReport,
    morningEmailResult,
    weeklyReport,
    weeklyEmailResult,
    userReports: userReports.map((result, index) =>
      result.status === "fulfilled"
        ? { userId: users[index].id, ...result.value }
        : { userId: users[index].id, error: result.reason instanceof Error ? result.reason.message : "Kullanici raporu uretilemedi." },
    ),
  });
}
