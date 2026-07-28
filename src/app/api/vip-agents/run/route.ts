import { NextResponse } from "next/server";
import { runVipTradingAgents } from "@/lib/vip-agents/engine";
import { isCronRequestAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (!isCronRequestAuthorized(request, {
    envName: "VIP_AGENTS_CRON_SECRET",
    headerName: "x-vip-agents-cron-secret",
  })) {
    return NextResponse.json({ error: "Yetkisiz VIP ajan isteği." }, { status: 401 });
  }
  const requestedDate = process.env.NODE_ENV !== "production" ? new URL(request.url).searchParams.get("at") : null;
  const parsedDate = requestedDate ? new Date(requestedDate) : new Date();
  const result = await runVipTradingAgents(Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate);
  return NextResponse.json(result);
}
