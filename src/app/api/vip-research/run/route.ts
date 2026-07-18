import { NextResponse } from "next/server";
import { evaluateDueVipIdeas } from "@/lib/vip-research/performance";
import { sendVipResearchEmails } from "@/lib/vip-research/email";
import { runVipResearchReport } from "@/lib/vip-research/report-engine";
import { runVipTradingAgents } from "@/lib/vip-agents/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = process.env.AI_AGENT_CRON_SECRET;

  if (!secret && process.env.NODE_ENV !== "production") {
    return true;
  }

  const requestUrl = new URL(request.url);
  return Boolean(secret && (request.headers.get("x-ai-agent-secret") === secret || requestUrl.searchParams.get("secret") === secret));
}

function getIstanbulClock(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Istanbul",
  }).formatToParts(date);

  return {
    hour: Number(parts.find((part) => part.type === "hour")?.value ?? "0"),
    minute: Number(parts.find((part) => part.type === "minute")?.value ?? "0"),
  };
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Yetkisiz VIP araştırma tetikleme isteği." }, { status: 401 });
  }

  const now = new Date();
  const force = new URL(request.url).searchParams.get("force") === "true";
  const clock = getIstanbulClock(now);

  if (!force && (clock.hour !== 7 || clock.minute !== 0)) {
    return NextResponse.json({
      scheduled: false,
      ranAt: now.toISOString(),
      currentTurkeyTime: `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`,
      scheduleTurkeyTime: "07:00",
    });
  }

  const evaluation = await evaluateDueVipIdeas(now);
  const report = await runVipResearchReport({ force });
  const tradingAgents = await runVipTradingAgents(now);
  const email = await sendVipResearchEmails(report.reportId);

  return NextResponse.json({ scheduled: true, ranAt: now.toISOString(), evaluation, report, tradingAgents, email });
}

export async function GET(request: Request) {
  return POST(request);
}
