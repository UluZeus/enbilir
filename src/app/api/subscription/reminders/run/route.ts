import { NextResponse } from "next/server";
import { runSubscriptionEmailJob } from "@/lib/subscription-emails";
import { isCronRequestAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!isCronRequestAuthorized(request, {
    envName: "SUBSCRIPTION_CRON_SECRET",
    headerName: "x-subscription-cron-secret",
  })) {
    return NextResponse.json({ error: "Yetkisiz abonelik maili tetikleme istegi." }, { status: 401 });
  }

  const url = new URL(request.url);
  const dryRun = url.searchParams.get("dryRun") === "true";
  const limitParam = Number(url.searchParams.get("limit") ?? 1000);
  const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 5000) : 1000;
  const startedAt = new Date();
  const result = await runSubscriptionEmailJob({ now: startedAt, dryRun, limit });

  return NextResponse.json({
    ranAt: startedAt.toISOString(),
    ...result,
  });
}
