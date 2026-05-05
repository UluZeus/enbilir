export const locales = ["tr", "en"] as const;
export const defaultLocale = "tr";

export type Locale = (typeof locales)[number];

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

export function getSafeLocale(value: string): Locale {
  return isLocale(value) ? value : defaultLocale;
}
