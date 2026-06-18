import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSafeLocale } from "@/i18n/config";
import { getRequestOrigin } from "@/lib/site-url";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_STATE_COOKIE = "enbilir_google_oauth_state";

function isConfiguredGoogleValue(value: string | undefined) {
  return Boolean(value && !value.startsWith("your-") && !value.startsWith("change-"));
}

function getRedirectUri(request: NextRequest) {
  return new URL("/api/auth/google/callback", getRequestOrigin(request)).toString();
}

function getSafeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const locale = getSafeLocale(request.nextUrl.searchParams.get("locale") ?? "tr");
  const returnTo = getSafeReturnPath(request.nextUrl.searchParams.get("returnTo"));
  const origin = getRequestOrigin(request);

  if (!isConfiguredGoogleValue(clientId)) {
    return NextResponse.redirect(new URL(`/${locale}/giris?error=${encodeURIComponent("Google giriş ayarları eksik.")}`, origin));
  }

  const configuredClientId = clientId as string;
  const state = randomUUID();
  const authUrl = new URL(GOOGLE_AUTH_URL);
  authUrl.searchParams.set("client_id", configuredClientId);
  authUrl.searchParams.set("redirect_uri", getRedirectUri(request));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid email profile");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "select_account");

  const response = NextResponse.redirect(authUrl);
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, JSON.stringify({ state, locale, returnTo }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
