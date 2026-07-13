import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { macroReportEventTypes } from "@/lib/ai-market/report-event-types";
import { recordMacroReportEvent } from "@/lib/ai-market/report-events";
import { reconcileOnboardingCompletion } from "@/lib/onboarding";

const allowedEventTypes = new Set<string>([
  macroReportEventTypes.read,
  macroReportEventTypes.pdfDownload,
]);

export async function POST(request: Request) {
  const user = await getSessionUser();

  try {
    const body = await request.json() as { reportId?: unknown; eventType?: unknown; metadata?: unknown };
    const reportId = typeof body.reportId === "string" ? body.reportId : "";
    const eventType = typeof body.eventType === "string" ? body.eventType : "";

    if (!reportId || !allowedEventTypes.has(eventType)) {
      return NextResponse.json({ ok: false, error: "Invalid report event." }, { status: 400 });
    }

    const report = await prisma.aiMarketReport.findFirst({
      where: {
        id: reportId,
        OR: user ? [{ userId: user.id }, { scope: { in: ["GLOBAL", "WEEKLY"] } }] : [{ scope: { in: ["GLOBAL", "WEEKLY"] } }],
      },
      select: { id: true },
    });

    if (!report) {
      return NextResponse.json({ ok: false, error: "Report not found." }, { status: 404 });
    }

    await recordMacroReportEvent({
      reportId,
      userId: user?.id,
      eventType: eventType as typeof macroReportEventTypes.read | typeof macroReportEventTypes.pdfDownload,
      metadata: typeof body.metadata === "object" && body.metadata !== null ? body.metadata as Record<string, unknown> : undefined,
    });
    if (user && eventType === macroReportEventTypes.read) {
      await reconcileOnboardingCompletion(user.id);
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, error: "Report event could not be recorded." }, { status: 500 });
  }
}
