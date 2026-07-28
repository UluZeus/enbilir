import { NextRequest, NextResponse } from "next/server";
import { getSafeLocale } from "@/i18n/config";
import { setSessionCookie } from "@/lib/auth";
import { getSelfServiceRegistrationDefaults } from "@/lib/auth-role-policy";
import { recordSiteAnalyticsEvent, siteAnalyticsEvents } from "@/lib/analytics";
import {
  canCreateGoogleAccount,
  hasRequiredLegalConsents,
  type GoogleOAuthStartContext,
} from "@/lib/google-oauth-consent";
import { prisma } from "@/lib/prisma";
import { ensureVirtualAccount } from "@/lib/portfolio";
import { getSafeLocaleReturnPath } from "@/lib/safe-navigation";
import { getRequestOrigin } from "@/lib/site-url";
import { sendGoogleWelcomeEmail } from "@/lib/welcome-email";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://openidconnect.googleapis.com/v1/userinfo";
const GOOGLE_OAUTH_STATE_COOKIE = "enbilir_google_oauth_state";
const GOOGLE_PROVIDER = "google";
const GOOGLE_FETCH_TIMEOUT_MS = 8_000;

function isConfiguredGoogleValue(value: string | undefined) {
  return Boolean(value && value !== "..." && !value.startsWith("your-") && !value.startsWith("change-"));
}

type GoogleState = GoogleOAuthStartContext & {
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

type GoogleOAuthStage = "configuration" | "token" | "userinfo";

class GoogleOAuthProviderError extends Error {
  constructor(
    readonly stage: GoogleOAuthStage,
    readonly reason: string,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super("Google giriş işlemi tamamlanamadı.", options);
    this.name = "GoogleOAuthProviderError";
  }
}

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
      intent: parsed.intent === "register" ? "register" : "login",
      kvkkDisclosureAccepted: parsed.kvkkDisclosureAccepted === true,
      termsAccepted: parsed.termsAccepted === true,
      noInvestmentAdviceAccepted: parsed.noInvestmentAdviceAccepted === true,
      electronicCommunicationConsent: parsed.electronicCommunicationConsent === true,
    };
  } catch {
    return null;
  }
}

function canCompletePendingEmailRegistration(
  user: {
    isActive: boolean;
    emailVerifiedAt: Date | null;
    emailVerificationTokenHash: string | null;
  },
  state: GoogleState,
) {
  return (
    !user.isActive
    && user.emailVerifiedAt === null
    && Boolean(user.emailVerificationTokenHash)
    && canCreateGoogleAccount(state)
  );
}

async function getGoogleUser(request: NextRequest, code: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!isConfiguredGoogleValue(clientId) || !isConfiguredGoogleValue(clientSecret)) {
    throw new GoogleOAuthProviderError("configuration", "missing_configuration");
  }

  const configuredClientId = clientId as string;
  const configuredClientSecret = clientSecret as string;

  let tokenResponse: Response;

  try {
    tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: configuredClientId,
        client_secret: configuredClientSecret,
        redirect_uri: getRedirectUri(request),
        grant_type: "authorization_code",
      }),
      signal: AbortSignal.timeout(GOOGLE_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")
      ? "timeout"
      : "network_error";
    throw new GoogleOAuthProviderError("token", reason, undefined, { cause: error });
  }

  let token: GoogleTokenResponse;

  try {
    token = (await tokenResponse.json()) as GoogleTokenResponse;
  } catch (error) {
    throw new GoogleOAuthProviderError("token", "invalid_response", tokenResponse.status, { cause: error });
  }

  if (!tokenResponse.ok || !token.access_token) {
    throw new GoogleOAuthProviderError(
      "token",
      tokenResponse.ok ? "missing_access_token" : "http_error",
      tokenResponse.status,
    );
  }

  let userInfoResponse: Response;

  try {
    userInfoResponse = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
      signal: AbortSignal.timeout(GOOGLE_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const reason = error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")
      ? "timeout"
      : "network_error";
    throw new GoogleOAuthProviderError("userinfo", reason, undefined, { cause: error });
  }

  let userInfo: GoogleUserInfo;

  try {
    userInfo = (await userInfoResponse.json()) as GoogleUserInfo;
  } catch (error) {
    throw new GoogleOAuthProviderError("userinfo", "invalid_response", userInfoResponse.status, { cause: error });
  }

  if (!userInfoResponse.ok || !userInfo.sub || !userInfo.email || !userInfo.email_verified) {
    throw new GoogleOAuthProviderError(
      "userinfo",
      userInfoResponse.ok ? "missing_verified_identity" : "http_error",
      userInfoResponse.status,
    );
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
  const registrationErrorResponse = (message: string) => {
    const response = NextResponse.redirect(getRedirect(request, locale, "kayit", message));
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
    const registrationDefaults = getSelfServiceRegistrationDefaults(googleUser.email);
    const now = new Date();
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
      select: {
        id: true,
        name: true,
        nickname: true,
        displayNameMode: true,
        email: true,
        role: true,
        isActive: true,
        kvkkDisclosureAccepted: true,
        termsAccepted: true,
        noInvestmentAdviceAccepted: true,
      },
    });

    if (!user) {
      const existingUser = await prisma.user.findUnique({
        where: { email: googleUser.email },
        select: {
          id: true,
          name: true,
          nickname: true,
          displayNameMode: true,
          email: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
          emailVerificationTokenHash: true,
          kvkkDisclosureAccepted: true,
          termsAccepted: true,
          noInvestmentAdviceAccepted: true,
        },
      });

      if (existingUser) {
        const completingPendingRegistration = canCompletePendingEmailRegistration(existingUser, cookieState);

        if (!existingUser.isActive && !completingPendingRegistration) {
          return errorResponse(
            locale === "en"
              ? "Your account is not active. Contact support if you believe this is an error."
              : "Hesabınız etkin değil. Bunun bir hata olduğunu düşünüyorsanız destek ekibiyle iletişime geçin.",
          );
        }

        if (!hasRequiredLegalConsents(existingUser) && !canCreateGoogleAccount(cookieState)) {
          return registrationErrorResponse(
            locale === "en"
              ? "Complete the required declarations on the registration page before linking this Google account."
              : "Bu Google hesabını bağlamadan önce kayıt sayfasındaki zorunlu onayları tamamlayın.",
          );
        }

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
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            ...(completingPendingRegistration ? { isActive: true } : {}),
            emailVerifiedAt: now,
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null,
            emailVerificationSentAt: null,
            ...(!existingUser.kvkkDisclosureAccepted && cookieState.kvkkDisclosureAccepted ? {
              kvkkDisclosureAccepted: true,
              kvkkDisclosureAcceptedAt: now,
            } : {}),
            ...(!existingUser.termsAccepted && cookieState.termsAccepted ? {
              termsAccepted: true,
              termsAcceptedAt: now,
            } : {}),
            ...(!existingUser.noInvestmentAdviceAccepted && cookieState.noInvestmentAdviceAccepted ? {
              noInvestmentAdviceAccepted: true,
              noInvestmentAdviceAcceptedAt: now,
            } : {}),
            ...(cookieState.electronicCommunicationConsent ? {
              electronicCommunicationConsent: true,
              electronicCommunicationConsentAt: now,
            } : {}),
          },
          select: {
            id: true,
            name: true,
            nickname: true,
            displayNameMode: true,
            email: true,
            role: true,
            isActive: true,
            kvkkDisclosureAccepted: true,
            termsAccepted: true,
            noInvestmentAdviceAccepted: true,
          },
        });
      } else {
        if (!canCreateGoogleAccount(cookieState)) {
          return registrationErrorResponse(
            locale === "en"
              ? "No account was found. Register with Google after accepting the required declarations."
              : "Hesap bulunamadı. Zorunlu onayları verdikten sonra Google ile kayıt olun.",
          );
        }

        user = await prisma.user.create({
          data: {
            name: googleUser.name,
            nickname: registrationDefaults.nickname,
            displayNameMode: registrationDefaults.displayNameMode,
            email: googleUser.email,
            passwordHash: null,
            isActive: true,
            emailVerifiedAt: now,
            role: registrationDefaults.role,
            kvkkDisclosureAccepted: true,
            kvkkDisclosureAcceptedAt: now,
            termsAccepted: true,
            termsAcceptedAt: now,
            noInvestmentAdviceAccepted: true,
            noInvestmentAdviceAcceptedAt: now,
            electronicCommunicationConsent: cookieState.electronicCommunicationConsent,
            electronicCommunicationConsentAt: cookieState.electronicCommunicationConsent ? now : null,
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
          select: {
            id: true,
            name: true,
            nickname: true,
            displayNameMode: true,
            email: true,
            role: true,
            isActive: true,
            kvkkDisclosureAccepted: true,
            termsAccepted: true,
            noInvestmentAdviceAccepted: true,
          },
        });
        createdWithGoogle = true;
        await sendGoogleWelcomeEmail({ to: googleUser.email, name: googleUser.name }).catch((error: unknown) => {
          console.error("[google-welcome-email]", error instanceof Error ? error.message : error);
        });
      }
    } else {
      if (!user.isActive) {
        return errorResponse(
          locale === "en"
            ? "Your account is not active. Contact support if you believe this is an error."
            : "Hesabınız etkin değil. Bunun bir hata olduğunu düşünüyorsanız destek ekibiyle iletişime geçin.",
        );
      }

      if (!hasRequiredLegalConsents(user) && !canCreateGoogleAccount(cookieState)) {
        return registrationErrorResponse(
          locale === "en"
            ? "Complete the required declarations on the registration page before signing in with Google."
            : "Google ile girişten önce kayıt sayfasındaki zorunlu onayları tamamlayın.",
        );
      }

      if (!hasRequiredLegalConsents(user) || cookieState.electronicCommunicationConsent) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            emailVerifiedAt: now,
            emailVerificationTokenHash: null,
            emailVerificationExpiresAt: null,
            emailVerificationSentAt: null,
            ...(!user.kvkkDisclosureAccepted && cookieState.kvkkDisclosureAccepted ? {
              kvkkDisclosureAccepted: true,
              kvkkDisclosureAcceptedAt: now,
            } : {}),
            ...(!user.termsAccepted && cookieState.termsAccepted ? {
              termsAccepted: true,
              termsAcceptedAt: now,
            } : {}),
            ...(!user.noInvestmentAdviceAccepted && cookieState.noInvestmentAdviceAccepted ? {
              noInvestmentAdviceAccepted: true,
              noInvestmentAdviceAcceptedAt: now,
            } : {}),
            ...(cookieState.electronicCommunicationConsent ? {
              electronicCommunicationConsent: true,
              electronicCommunicationConsentAt: now,
            } : {}),
          },
          select: {
            id: true,
            name: true,
            nickname: true,
            displayNameMode: true,
            email: true,
            role: true,
            isActive: true,
            kvkkDisclosureAccepted: true,
            termsAccepted: true,
            noInvestmentAdviceAccepted: true,
          },
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
    if (error instanceof GoogleOAuthProviderError) {
      console.error("[google-oauth]", {
        event: "provider_request_failed",
        stage: error.stage,
        reason: error.reason,
        ...(error.status === undefined ? {} : { status: error.status }),
      });
    } else {
      console.error("[google-oauth]", {
        event: "callback_failed",
        reason: "unexpected_error",
      });
    }

    return errorResponse(
      locale === "en"
        ? "Google sign-in could not be completed. Please try again."
        : "Google giriş işlemi tamamlanamadı. Lütfen tekrar deneyin.",
    );
  }
}
