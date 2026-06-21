import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { MacroReportEventType } from "@/lib/ai-market/report-event-types";

type RecordMacroReportEventInput = {
  reportId: string;
  userId?: string | null;
  eventType: MacroReportEventType;
  metadata?: Record<string, unknown>;
};

export async function recordMacroReportEvent({
  reportId,
  userId,
  eventType,
  metadata,
}: RecordMacroReportEventInput) {
  try {
    await prisma.aiMarketReportEvent.create({
      data: {
        reportId,
        userId: userId ?? null,
        eventType,
        metadata: metadata as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (error) {
    console.warn("Macro report event could not be recorded", { reportId, eventType, error });
  }
}
