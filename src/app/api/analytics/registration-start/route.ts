import { NextResponse } from "next/server";
import { getSafeLocale } from "@/i18n/config";
import { recordSiteAnalyticsEvent, siteAnalyticsEvents } from "@/lib/analytics";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { locale?: string; sessionKey?: string } | null;
  const locale = getSafeLocale(body?.locale ?? "tr");
  await recordSiteAnalyticsEvent({
    eventType: siteAnalyticsEvents.registrationStarted,
    sessionKey: body?.sessionKey,
    locale,
    path: `/${locale}/kayit`,
    request: { headers: request.headers },
  });
  return NextResponse.json({ ok: true });
}
