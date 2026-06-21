import { NextResponse } from "next/server";
import { runSubscriptionEmailJob, subscriptionEmailConfig } from "@/lib/subscription-emails";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function isAuthorized(request: Request) {
  const secret = process.env.SUBSCRIPTION_CRON_SECRET ?? process.env.AI_AGENT_CRON_SECRET;

  if (!secret && process.env.NODE_ENV !== "production") {
    return true;
  }

  const headerSecret = request.headers.get("x-subscription-cron-secret") ?? request.headers.get("x-ai-agent-secret");
  const urlSecret = new URL(request.url).searchParams.get("secret");

  return Boolean(secret && (headerSecret === secret || urlSecret === secret));
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Yetkisiz abonelik maili tetikleme istegi." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  const testEmail = url.searchParams.get("testEmail")?.trim() || undefined;
  const limitParam = Number(url.searchParams.get("limit") ?? 1000);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 5000) : 1000;
  const startedAt = new Date();
  const result = await runSubscriptionEmailJob({ now: startedAt, dryRun, testEmail, limit });

  return NextResponse.json({
    ranAt: startedAt.toISOString(),
    paymentLink: subscriptionEmailConfig.paymentLink,
    ...result,
  });
}

export async function GET(request: Request) {
  return POST(request);
}
