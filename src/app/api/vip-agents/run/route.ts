import { NextResponse } from "next/server";
import { runVipTradingAgents } from "@/lib/vip-agents/engine";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(request: Request) {
  const secret = process.env.AI_AGENT_CRON_SECRET;
  if (!secret && process.env.NODE_ENV !== "production") return true;
  const url = new URL(request.url);
  return Boolean(secret && (request.headers.get("x-ai-agent-secret") === secret || url.searchParams.get("secret") === secret));
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) return NextResponse.json({ error: "Yetkisiz VIP ajan isteği." }, { status: 401 });
  const requestedDate = process.env.NODE_ENV !== "production" ? new URL(request.url).searchParams.get("at") : null;
  const parsedDate = requestedDate ? new Date(requestedDate) : new Date();
  const result = await runVipTradingAgents(Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate);
  return NextResponse.json(result);
}

export async function GET(request: Request) {
  return POST(request);
}
