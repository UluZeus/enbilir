import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import { createHash, timingSafeEqual } from "crypto";
import type { DisplayNameMode, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const DEVELOPMENT_SESSION_COOKIE = "enbilir_session";
export const SESSION_COOKIE = "__Host-enbilir_session";
const DEVELOPMENT_GOOGLE_OAUTH_STATE_COOKIE = "enbilir_google_oauth_state";
export const GOOGLE_OAUTH_STATE_COOKIE = "__Host-enbilir_google_oauth_state";

export type SessionUser = {
  id: string;
  name: string;
  nickname: string | null;
  displayNameMode: DisplayNameMode;
  email: string;
  role: Role;
};

const encoder = new TextEncoder();
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 60 * 10;
const GOOGLE_OAUTH_STATE_ISSUER = "enbilir";
const GOOGLE_OAUTH_STATE_AUDIENCE = "google-oauth-state";

type GoogleOAuthStatePayload = {
  state: string;
  locale: string;
  returnTo: string | null;
  intent: "login" | "register";
  kvkkDisclosureAccepted: boolean;
  termsAccepted: boolean;
  noInvestmentAdviceAccepted: boolean;
  electronicCommunicationConsent: boolean;
};

function isProduction() {
  return process.env.NODE_ENV === "production";
}

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (isProduction() && (!secret || secret.length < 32)) {
    throw new Error("Production için en az 32 karakterlik AUTH_SECRET tanımlanmalıdır.");
  }

  return encoder.encode(secret ?? "enbilir-local-development-secret-change-before-production");
}

export function getSessionCookieName() {
  return isProduction() ? SESSION_COOKIE : DEVELOPMENT_SESSION_COOKIE;
}

export function getGoogleOAuthStateCookieName() {
  return isProduction() ? GOOGLE_OAUTH_STATE_COOKIE : DEVELOPMENT_GOOGLE_OAUTH_STATE_COOKIE;
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export function getGoogleOAuthStateCookieOptions(maxAge = GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: isProduction(),
    path: "/",
    maxAge,
  };
}

export async function createSessionToken(user: SessionUser, sessionVersion = 0) {
  return new SignJWT({ ...user, sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

async function getPersistedSessionVersion(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { sessionVersion: true },
  });

  if (!user) {
    throw new Error("Session user no longer exists.");
  }

  return user.sessionVersion;
}

export async function createSession(user: SessionUser) {
  const token = await createSessionToken(user, await getPersistedSessionVersion(user.id));
  const cookieStore = await cookies();
  cookieStore.set(getSessionCookieName(), token, getSessionCookieOptions());
}

export async function setSessionCookie(response: NextResponse, user: SessionUser) {
  const token = await createSessionToken(user, await getPersistedSessionVersion(user.id));
  response.cookies.set(getSessionCookieName(), token, getSessionCookieOptions());
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(getSessionCookieName());
}

export async function revokeUserSessions(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: { sessionVersion: { increment: 1 } },
  });
}

export function hashGoogleOAuthState(state: string) {
  return createHash("sha256").update(state).digest("hex");
}

export function matchesGoogleOAuthState(expected: string, actual: string) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  return expectedBuffer.length === actualBuffer.length && timingSafeEqual(expectedBuffer, actualBuffer);
}

export async function createGoogleOAuthStateToken(state: GoogleOAuthStatePayload) {
  return new SignJWT(state)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer(GOOGLE_OAUTH_STATE_ISSUER)
    .setAudience(GOOGLE_OAUTH_STATE_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifyGoogleOAuthStateToken(token: string | undefined): Promise<GoogleOAuthStatePayload | null> {
  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ["HS256"],
      issuer: GOOGLE_OAUTH_STATE_ISSUER,
      audience: GOOGLE_OAUTH_STATE_AUDIENCE,
    });

    if (
      typeof payload.state !== "string"
      || typeof payload.locale !== "string"
      || (payload.returnTo !== null && typeof payload.returnTo !== "string")
      || (payload.intent !== "login" && payload.intent !== "register")
      || typeof payload.kvkkDisclosureAccepted !== "boolean"
      || typeof payload.termsAccepted !== "boolean"
      || typeof payload.noInvestmentAdviceAccepted !== "boolean"
      || typeof payload.electronicCommunicationConsent !== "boolean"
    ) {
      return null;
    }

    return {
      state: payload.state,
      locale: payload.locale,
      returnTo: payload.returnTo,
      intent: payload.intent,
      kvkkDisclosureAccepted: payload.kvkkDisclosureAccepted,
      termsAccepted: payload.termsAccepted,
      noInvestmentAdviceAccepted: payload.noInvestmentAdviceAccepted,
      electronicCommunicationConsent: payload.electronicCommunicationConsent,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(getSessionCookieName())?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = typeof payload.id === "string" ? payload.id : null;
    const sessionVersion = typeof payload.sessionVersion === "number" && Number.isInteger(payload.sessionVersion)
      ? payload.sessionVersion
      : null;

    if (!userId || (isProduction() && sessionVersion === null)) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        nickname: true,
        displayNameMode: true,
        email: true,
        role: true,
        isActive: true,
        sessionVersion: true,
      },
    });

    if (!user) {
      return null;
    }

    if (!user.isActive || (sessionVersion !== null && sessionVersion !== user.sessionVersion)) {
      return null;
    }

    return {
      id: user.id,
      name: user.name,
      nickname: user.nickname,
      displayNameMode: user.displayNameMode,
      email: user.email,
      role: user.role,
    };
  } catch {
    return null;
  }
}

export function canAccessAdmin(role: Role) {
  return role === "ADMIN" || role === "MASTER_ADMIN";
}

export function getDisplayName(user: Pick<SessionUser, "name" | "nickname" | "displayNameMode">) {
  return user.displayNameMode === "NICKNAME" && user.nickname ? user.nickname : user.name;
}
