import { NextResponse } from "next/server";
import { evaluateDueVipIdeas } from "@/lib/vip-research/performance";
import { sendVipResearchEmails } from "@/lib/vip-research/email";
import { runVipResearchReport } from "@/lib/vip-research/report-engine";
import { getIstanbulClock, isVipResearchScheduleWindow } from "@/lib/vip-research/schedule";
import { runVipTradingAgents } from "@/lib/vip-agents/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

function isAuthorized(request: Request) {
  const secret = process.env.AI_AGENT_CRON_SECRET;

  if (!secret && process.env.NODE_ENV !== "production") {
    return true;
  }

  return Boolean(secret && request.headers.get("x-ai-agent-secret") === secret);
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Yetkisiz VIP araştırma tetikleme isteği." }, { status: 401 });
  }

  const now = new Date();
  const force = new URL(request.url).searchParams.get("force") === "true";
  const clock = getIstanbulClock(now);

  if (!force && !isVipResearchScheduleWindow(now)) {
    return NextResponse.json({
      scheduled: false,
      ranAt: now.toISOString(),
      currentTurkeyTime: `${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}`,
      scheduleTurkeyTime: "07:00",
    });
  }

  const evaluation = await evaluateDueVipIdeas(now);
  const report = await runVipResearchReport();
  const tradingAgents = await runVipTradingAgents(now, { force });
  const email = await sendVipResearchEmails(report.reportId);

  return NextResponse.json({ scheduled: true, ranAt: now.toISOString(), evaluation, report, tradingAgents, email });
}
