const DEFAULT_SITE_URL = "https://enbilir.com";

function normalizeSiteUrl(value: string | undefined) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function getSiteUrl() {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? DEFAULT_SITE_URL;
}

export function getRequestOrigin(request: { nextUrl?: { origin: string } }) {
  return normalizeSiteUrl(process.env.NEXT_PUBLIC_SITE_URL) ?? request.nextUrl?.origin ?? DEFAULT_SITE_URL;
}
