import { NextRequest, NextResponse } from "next/server";
import { getSafeLocale } from "@/i18n/config";
import { masterAdminEmail, setSessionCookie } from "@/lib/auth";
import { recordSiteAnalyticsEvent, siteAnalyticsEvents } from "@/lib/analytics";
import { prisma } from "@/lib/prisma";
import { ensureVirtualAccount } from "@/lib/portfolio";
import { getSafeLocaleReturnPath } from "@/lib/safe-navigation";
import { getRequestOrigin } from "@/lib/site-url";
import { sendGoogleWelcomeEmail } from "@/lib/welcome-email";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_OAUTH_STATE_COOKIE = "enbilir_google_oauth_state";
const GOOGLE_PROVIDER = "google";

function isConfiguredGoogleValue(value: string | undefined) {
  return Boolean(value && value !== "..." && !value.startsWith("your-") && !value.startsWith("change-"));
}

type GoogleState = {
  state: string;
  locale: string;
  returnTo: string | null;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
};

type GoogleUserInfo = {
  sub?: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
};

function getRedirectUri(request: NextRequest) {
  return new URL("/api/auth/google/callback", getRequestOrigin(request)).toString();
}

function getRedirect(request: NextRequest, localeValue: string | null, path: string, error?: string) {
  const locale = getSafeLocale(localeValue ?? "tr");
  const url = new URL(`/${locale}/${path}`, getRequestOrigin(request));

  if (error) {
    url.searchParams.set("error", error);
  }

  return url;
}

function parseState(value: string | undefined): GoogleState | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<GoogleState>;

    if (typeof parsed.state !== "string" || typeof parsed.locale !== "string") {
      return null;
    }

    const locale = getSafeLocale(parsed.locale);

    return {
      state: parsed.state,
      locale,
      returnTo: getSafeLocaleReturnPath(parsed.returnTo, locale),
    };
  } catch {
    return null;
  }
}

async function getGoogleUser(request: NextRequest, code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!isConfiguredGoogleValue(clientId) || !isConfiguredGoogleValue(clientSecret)) {
    throw new Error("Google giriş ayarları eksik.");
  }

  const configuredClientId = clientId as string;
  const configuredClientSecret = clientSecret as string;

  const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: configuredClientId,
      client_secret: configuredClientSecret,
      redirect_uri: getRedirectUri(request),
      grant_type: "authorization_code",
    }),
  });
  const token = (await tokenResponse.json()) as GoogleTokenResponse;

  if (!tokenResponse.ok || !token.access_token) {
    throw new Error(token.error || "Google giriş yanıtı alınamadı.");
  }

  const userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  const userInfo = (await userInfoResponse.json()) as GoogleUserInfo;

  if (!userInfoResponse.ok || !userInfo.sub || !userInfo.email || !userInfo.email_verified) {
    throw new Error("Google hesabında doğrulanmış e-posta bulunamadı.");
  }

  return {
    providerAccountId: userInfo.sub,
    email: userInfo.email.trim().toLowerCase(),
    name: userInfo.name?.trim() || userInfo.email.split("@")[0] || "Google Kullanıcısı",
  };
}

export async function GET(request: NextRequest) {
  const cookieState = parseState(request.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value);
  const returnedState = request.nextUrl.searchParams.get("state");
  const code = request.nextUrl.searchParams.get("code");
  const locale = cookieState?.locale ?? "tr";
  const errorResponse = (message: string) => {
    const response = NextResponse.redirect(getRedirect(request, locale, "giris", message));
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  };

  if (!cookieState || !returnedState || cookieState.state !== returnedState) {
    return errorResponse("Google giriş doğrulaması başarısız oldu.");
  }

  if (!code) {
    return errorResponse("Google giriş kodu alınamadı.");
  }

  try {
    const googleUser = await getGoogleUser(request, code);
    const role = googleUser.email === masterAdminEmail ? "MASTER_ADMIN" : "USER";
    const nickname = googleUser.email === masterAdminEmail ? "UluZeus" : null;
    let createdWithGoogle = false;
    let user = await prisma.user.findFirst({
      where: {
        oauthAccounts: {
          some: {
            provider: GOOGLE_PROVIDER,
            providerAccountId: googleUser.providerAccountId,
          },
        },
      },
      select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true },
    });

    if (!user) {
      const existingUser = await prisma.user.findUnique({
        where: { email: googleUser.email },
        select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true, isActive: true },
      });

      if (existingUser) {
        await prisma.oAuthAccount.upsert({
          where: {
            provider_providerAccountId: {
              provider: GOOGLE_PROVIDER,
              providerAccountId: googleUser.providerAccountId,
            },
          },
          create: {
            provider: GOOGLE_PROVIDER,
            providerAccountId: googleUser.providerAccountId,
            userId: existingUser.id,
          },
          update: { userId: existingUser.id },
        });
        if (!existingUser.isActive) {
          const activatedUser = await prisma.user.update({
            where: { id: existingUser.id },
            data: {
              isActive: true,
              emailVerifiedAt: new Date(),
              emailVerificationTokenHash: null,
              emailVerificationExpiresAt: null,
              emailVerificationSentAt: null,
            },
            select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true },
          });

          user = activatedUser;
        } else {
          user = existingUser;
        }
      } else {
        user = await prisma.user.create({
          data: {
            name: googleUser.name,
            nickname,
            displayNameMode: nickname ? "NICKNAME" : "REAL_NAME",
            email: googleUser.email,
            passwordHash: null,
            isActive: true,
            emailVerifiedAt: new Date(),
            role,
            oauthAccounts: {
              create: {
                provider: GOOGLE_PROVIDER,
                providerAccountId: googleUser.providerAccountId,
              },
            },
            virtualAccount: {
              create: {
                cashAmount: 1000000,
                cashMode: "USD",
                baseCurrency: "USD",
              },
            },
          },
          select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true },
        });
        createdWithGoogle = true;
        await sendGoogleWelcomeEmail({ to: googleUser.email, name: googleUser.name }).catch((error: unknown) => {
          console.error("[google-welcome-email]", error instanceof Error ? error.message : error);
        });
      }
    }

    await ensureVirtualAccount(user.id);

    if (createdWithGoogle) {
      await recordSiteAnalyticsEvent({
        eventType: siteAnalyticsEvents.register,
        userId: user.id,
        locale,
        path: "/api/auth/google/callback",
        request: { headers: request.headers },
        metadata: {
          provider: GOOGLE_PROVIDER,
          displayNameMode: user.displayNameMode,
        },
      });
    }

    const response = NextResponse.redirect(new URL(cookieState.returnTo || `/${locale}/panel`, getRequestOrigin(request)));
    await setSessionCookie(response, user);
    response.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    return response;
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : "Google giriş işlemi tamamlanamadı.");
  }
}
