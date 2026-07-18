import type { Locale } from "@/i18n/config";

const managedContentDetailPattern = /^\/(tr|en)\/(blog|egitim)\/([^/]+)\/?$/;

export function getManagedContentIdForLocale(id: string, locale: Locale) {
  const baseId = id.endsWith("-en") ? id.slice(0, -3) : id;
  return locale === "en" ? `${baseId}-en` : baseId;
}

export function getManagedContentLocalizedIds(id: string) {
  return {
    tr: getManagedContentIdForLocale(id, "tr"),
    en: getManagedContentIdForLocale(id, "en"),
  } satisfies Record<Locale, string>;
}

export function getLocalizedPath(pathname: string, language: Locale, fallbackLocale: Locale) {
  const detailMatch = pathname.match(managedContentDetailPattern);

  if (detailMatch) {
    const [, currentLocale, section, id] = detailMatch;

    if (currentLocale === language) {
      return pathname;
    }

    return `/${language}/${section}/${getManagedContentIdForLocale(id, language)}`;
  }

  const localized = pathname.replace(/^\/(tr|en)(?=\/|$)/, `/${language}`);
  return localized === pathname && !pathname.startsWith(`/${fallbackLocale}`) ? `/${language}` : localized;
}
