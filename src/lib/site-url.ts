const DEFAULT_SITE_URL = "https://enbilir.com";
const PRODUCTION_SITE_URL_ERROR = "Production site URL configuration is invalid.";

function normalizeSiteUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);

    if (
      (url.protocol !== "http:" && url.protocol !== "https:")
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) {
      return null;
    }

    return url.origin;
  } catch {
    return null;
  }
}

function getProductionSiteUrl() {
  const siteUrl = normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL);

  if (!siteUrl || !siteUrl.startsWith("https://")) {
    throw new Error(PRODUCTION_SITE_URL_ERROR);
  }

  return siteUrl;
}

export function getSiteUrl() {
  if (process.env.NODE_ENV === "production") {
    return getProductionSiteUrl();
  }

  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? DEFAULT_SITE_URL;
}

export function getRequestOrigin(request: { nextUrl?: { origin: string } }) {
  if (process.env.NODE_ENV === "production") {
    return getProductionSiteUrl();
  }

  if (request.nextUrl?.origin) {
    return request.nextUrl.origin;
  }
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? DEFAULT_SITE_URL;
}
