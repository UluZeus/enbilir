import { NextResponse } from "next/server";
import { sendMorningMacroReportEmails } from "@/lib/ai-market/agent/morning-report-email";
import { runAiMarketAgent } from "@/lib/ai-market/agent/report-agent";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const REPORT_SCHEDULE_TIME_ZONE = "Europe/Istanbul";
const REPORT_SCHEDULE_MINUTE = 55;
const REPORT_SCHEDULE_HOURS = new Set([6, 8, 11, 14, 17, 20, 23]);

function isAuthorized(request: Request) {
  const secret = process.env.AI_AGENT_CRON_SECRET;

  if (!secret && process.env.NODE_ENV !== "production") {
    return true;
  }

  const headerSecret = request.headers.get("x-ai-agent-secret");
  const urlSecret = new URL(request.url).searchParams.get("secret");

  return Boolean(secret && (headerSecret === secret || urlSecret === secret));
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

  return hour === 6 && minute === REPORT_SCHEDULE_MINUTE;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Yetkisiz ajan tetikleme istegi." }, { status: 401 });
  }

  const url = new URL(request.url);
  const force = url.searchParams.get("force") === "true";

  if (!force && !isScheduledReportTime()) {
    const { hour, minute } = getIstanbulTimeParts();

    return NextResponse.json({
      ranAt: new Date().toISOString(),
      scheduled: false,
      message: "AI piyasa raporu yalnizca Turkiye saatiyle 06:55, 08:55, 11:55, 14:55, 17:55, 20:55 ve 23:55 zamanlarinda uretilir.",
      currentTurkeyTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
      scheduleTurkeyTime: ["06:55", "08:55", "11:55", "14:55", "17:55", "20:55", "23:55"],
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

  if (!globalReport.reused && isMorningReportTime()) {
    const recipients = await prisma.user.findMany({
      where: { isActive: true },
      select: { email: true, name: true },
    });
    morningEmailResult = await sendMorningMacroReportEmails({
      reportId: globalReport.reportId,
      recipients,
    });
  }

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    scheduled: true,
    globalReport,
    morningEmailResult,
    userReports: userReports.map((result, index) =>
      result.status === "fulfilled"
        ? { userId: users[index].id, ...result.value }
        : { userId: users[index].id, error: result.reason instanceof Error ? result.reason.message : "Kullanici raporu uretilemedi." },
    ),
  });
}

export async function GET(request: Request) {
  return POST(request);
}
