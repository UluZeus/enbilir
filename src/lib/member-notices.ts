import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const SUPPORT_TIME_ZONE = "Europe/Istanbul";
export const SUPPORT_INTRO_PERIOD_KEY = "ai-cost-support-v1";
export const MAX_MONTHLY_SUPPORT_PROMPTS = 3;

export type MemberNoticeKind = "ONBOARDING" | "MONTHLY_SUPPORT";
export type MemberNoticeClaim = {
  kind: MemberNoticeKind;
  periodKey: string;
};

export function getIstanbulSupportMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: SUPPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  const year = value("year");
  const month = value("month");
  const dayOfMonth = value("day");
  const periodKey = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;

  return {
    periodKey,
    dayOfMonth,
    startsAt: new Date(`${periodKey}-01T00:00:00+03:00`),
  };
}

export function isValidMemberNoticeEntryToken(value: string) {
  return /^[A-Za-z0-9_-]{16,128}$/.test(value);
}

function hashEntryToken(value: string) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function isUniqueConstraintError(error: unknown) {
  return (
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    || (
      typeof error === "object"
      && error !== null
      && "code" in error
      && error.code === "P2002"
    )
  );
}

export async function claimMemberNotice({
  userId,
  entryToken,
  now = new Date(),
}: {
  userId: string;
  entryToken: string;
  now?: Date;
}): Promise<MemberNoticeClaim | null> {
  if (!userId || !isValidMemberNoticeEntryToken(entryToken)) {
    return null;
  }

  const { periodKey } = getIstanbulSupportMonth(now);
  const entryTokenHash = hashEntryToken(entryToken);

  try {
    return await prisma.$transaction(async (transaction) => {
      const user = await transaction.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          isActive: true,
          supportIntroShownAt: true,
          membershipTier: true,
          vipPaidUntil: true,
          vipSubscriptionClaims: {
            where: { status: "PENDING" },
            select: { id: true },
            take: 1,
          },
        },
      });

      const isPaidVipActive = user?.membershipTier === "VIP"
        && Boolean(user.vipPaidUntil && user.vipPaidUntil > now);
      if (!user?.isActive || isPaidVipActive || user.vipSubscriptionClaims.length > 0) {
        return null;
      }

      const period = await transaction.supportReminderPeriod.upsert({
        where: {
          userId_periodKey: {
            userId,
            periodKey,
          },
        },
        create: {
          userId,
          periodKey,
        },
        update: {},
        select: {
          id: true,
          onsitePromptCount: true,
          suppressedAt: true,
        },
      });

      if (!user.supportIntroShownAt) {
        if (
          period.suppressedAt
          || period.onsitePromptCount >= MAX_MONTHLY_SUPPORT_PROMPTS
        ) {
          return null;
        }

        const introduction = await transaction.user.updateMany({
          where: {
            id: userId,
            supportIntroShownAt: null,
          },
          data: {
            supportIntroShownAt: now,
          },
        });

        if (introduction.count !== 1) {
          return null;
        }

        const counted = await transaction.supportReminderPeriod.updateMany({
          where: {
            id: period.id,
            onsitePromptCount: { lt: MAX_MONTHLY_SUPPORT_PROMPTS },
            suppressedAt: null,
          },
          data: {
            onsitePromptCount: { increment: 1 },
          },
        });
        if (counted.count !== 1) {
          throw new Error("Member support introduction could not be counted.");
        }

        await transaction.supportReminderEntry.create({
          data: {
            userId,
            periodId: period.id,
            entryTokenHash,
          },
        });

        return { kind: "ONBOARDING", periodKey: SUPPORT_INTRO_PERIOD_KEY };
      }

      const claimed = await transaction.supportReminderPeriod.updateMany({
        where: {
          id: period.id,
          onsitePromptCount: { lt: MAX_MONTHLY_SUPPORT_PROMPTS },
          suppressedAt: null,
        },
        data: {
          onsitePromptCount: { increment: 1 },
        },
      });

      if (claimed.count !== 1) {
        return null;
      }

      await transaction.supportReminderEntry.create({
        data: {
          userId,
          periodId: period.id,
          entryTokenHash,
        },
      });

      return { kind: "MONTHLY_SUPPORT", periodKey };
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return null;
    }
    throw error;
  }
}

export async function suppressMemberNotice({
  userId,
  kind,
  now = new Date(),
}: {
  userId: string;
  kind: MemberNoticeKind;
  now?: Date;
}) {
  const { periodKey } = getIstanbulSupportMonth(now);
  await prisma.$transaction(async (transaction) => {
    if (kind === "ONBOARDING") {
      await transaction.user.updateMany({
        where: {
          id: userId,
          supportIntroShownAt: null,
        },
        data: {
          supportIntroShownAt: now,
        },
      });
    }

    await transaction.supportReminderPeriod.upsert({
      where: {
        userId_periodKey: {
          userId,
          periodKey,
        },
      },
      create: {
        userId,
        periodKey,
        suppressedAt: now,
      },
      update: {
        suppressedAt: now,
      },
    });
  });
}
