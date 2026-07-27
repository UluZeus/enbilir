import { membershipConfig } from "@/lib/membership";

export const AI_QUERY_TIME_ZONE = "Europe/Istanbul";

export type AiQueryQuota = {
  limit: number;
  used: number;
  remaining: number;
  resetAt: string;
  isPaidVipActive: boolean;
};

function getIstanbulDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: AI_QUERY_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
  };
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;
}

export function getIstanbulAiQueryWindow(date = new Date()) {
  const current = getIstanbulDateParts(date);
  const dayKey = formatDateKey(current.year, current.month, current.day);
  const nextUtcDate = new Date(Date.UTC(current.year, current.month - 1, current.day + 1));
  const nextDayKey = formatDateKey(
    nextUtcDate.getUTCFullYear(),
    nextUtcDate.getUTCMonth() + 1,
    nextUtcDate.getUTCDate(),
  );

  return {
    dayKey,
    resetAt: new Date(`${nextDayKey}T00:00:00+03:00`).toISOString(),
  };
}

export function getDailyAiQueryLimit(isPaidVipActive: boolean) {
  return isPaidVipActive
    ? membershipConfig.paidVipDailyAiQueryLimit
    : membershipConfig.freeDailyAiQueryLimit;
}

export function buildAiQueryQuota({
  used,
  isPaidVipActive,
  resetAt,
}: {
  used: number;
  isPaidVipActive: boolean;
  resetAt: string;
}): AiQueryQuota {
  const limit = getDailyAiQueryLimit(isPaidVipActive);

  return {
    limit,
    used,
    remaining: Math.max(0, limit - used),
    resetAt,
    isPaidVipActive,
  };
}
