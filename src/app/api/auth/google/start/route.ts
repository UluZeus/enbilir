import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSafeLocale } from "@/i18n/config";
import { canCreateGoogleAccount, getGoogleOAuthStartContext } from "@/lib/google-oauth-consent";
import { getSafeLocaleReturnPath } from "@/lib/safe-navigation";
import { getRequestOrigin } from "@/lib/site-url";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_STATE_COOKIE = "enbilir_google_oauth_state";

function isConfiguredGoogleValue(value: string | undefined) {
  return Boolean(value && value !== "..." && !value.startsWith("your-") && !value.startsWith("change-"));
}

function getRedirectUri(request: NextRequest) {
  return new URL("/api/auth/google/callback", getRequestOrigin(request)).toString();
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const locale = getSafeLocale(request.nextUrl.searchParams.get("locale") ?? "tr");
  const returnTo = getSafeLocaleReturnPath(request.nextUrl.searchParams.get("returnTo"), locale);
  const origin = getRequestOrigin(request);
  const consentContext = getGoogleOAuthStartContext(request.nextUrl.searchParams);

  if (!isConfiguredGoogleValue(clientId)) {
    return NextResponse.redirect(new URL(`/${locale}/giris?error=${encodeURIComponent("Google giriş ayarları eksik.")}`, origin));
  }

  if (consentContext.intent === "register" && !canCreateGoogleAccount(consentContext)) {
    const message = locale === "en"
      ? "You must accept the required privacy, terms, and no-investment-advice declarations before registering with Google."
      : "Google ile kayıt için zorunlu KVKK, kullanım şartları ve yatırım tavsiyesi değildir onaylarını vermelisiniz.";

    return NextResponse.redirect(new URL(`/${locale}/kayit?error=${encodeURIComponent(message)}`, origin));
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
  response.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, JSON.stringify({
    state,
    locale,
    returnTo,
    ...consentContext,
  }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 10,
  });

  return response;
}
