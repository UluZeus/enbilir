export function getSafeLocaleReturnPath(value: unknown, locale: "tr" | "en") {
  const raw = String(value ?? "").trim();

  if (!raw.startsWith("/") || raw.startsWith("//") || raw.includes("\\")) {
    return null;
  }

  try {
    const parsed = new URL(raw, "https://enbilir.local");
    const localeRoot = `/${locale}`;

    if (parsed.origin !== "https://enbilir.local" || (parsed.pathname !== localeRoot && !parsed.pathname.startsWith(`${localeRoot}/`))) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}
