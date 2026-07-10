import type { Locale } from "@/i18n/config";

const usageGuideWelcomeStoragePrefix = "enbilir-usage-guide-welcome:v1";

export const usageGuideClosedEvent = "enbilir:usage-guide-closed";

export function getUsageGuideWelcomeStorageKey(locale: Locale) {
  return `${usageGuideWelcomeStoragePrefix}:${locale}`;
}
