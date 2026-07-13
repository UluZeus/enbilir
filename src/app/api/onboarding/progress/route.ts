import { NextResponse } from "next/server";
import { getSafeLocale } from "@/i18n/config";
import { recordSiteAnalyticsEvent, siteAnalyticsEvents } from "@/lib/analytics";
import { getSessionUser } from "@/lib/auth";
import {
  getOnboardingProgress,
  markOnboardingStep,
  markRiskOnboardingComplete,
  type TrackableOnboardingStep,
} from "@/lib/onboarding";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  return NextResponse.json({ ok: true, progress: await getOnboardingProgress(user.id) });
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    step?: string;
    score?: number;
    profile?: string;
    locale?: string;
  } | null;
  const locale = getSafeLocale(body?.locale ?? "tr");
  let progress;

  if (body?.step === "risk") {
    const score = Number(body.score);
    const profile = typeof body.profile === "string" ? body.profile.trim() : "";
    if (!Number.isFinite(score) || score < 1 || score > 5 || !profile) {
      return NextResponse.json({ ok: false, message: "Invalid risk result" }, { status: 400 });
    }
    progress = await markRiskOnboardingComplete(user.id, score, profile);
  } else if (["guide", "assistant", "chat", "ranking"].includes(body?.step ?? "")) {
    progress = await markOnboardingStep(user.id, body?.step as TrackableOnboardingStep);
  } else {
    return NextResponse.json({ ok: false, message: "Invalid onboarding step" }, { status: 400 });
  }

  await recordSiteAnalyticsEvent({
    eventType: siteAnalyticsEvents.onboardingStep,
    userId: user.id,
    locale,
    path: new URL(request.url).pathname,
    metadata: { step: body?.step, percent: progress.percent },
    request: { headers: request.headers },
  });

  return NextResponse.json({ ok: true, progress });
}
