import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { jwtVerify, SignJWT } from "jose";
import type { DisplayNameMode, Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "enbilir_session";
export const masterAdminEmail = process.env.MASTER_ADMIN_EMAIL?.toLowerCase() ?? "hakan@ultraakil.com";

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

function getSecret() {
  const secret = process.env.AUTH_SECRET;

  if (process.env.NODE_ENV === "production" && (!secret || secret.length < 32)) {
    throw new Error("Production için en az 32 karakterlik AUTH_SECRET tanımlanmalıdır.");
  }

  return encoder.encode(secret ?? "enbilir-local-development-secret-change-before-production");
}

function getSessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}

export async function createSessionToken(user: SessionUser) {
  return new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getSecret());
}

export async function createSession(user: SessionUser) {
  const token = await createSessionToken(user);
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, getSessionCookieOptions());
}

export async function setSessionCookie(response: NextResponse, user: SessionUser) {
  const token = await createSessionToken(user);
  response.cookies.set(SESSION_COOKIE, token, getSessionCookieOptions());
}

export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const userId = typeof payload.id === "string" ? payload.id : null;

    if (!userId) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    if (user.email === masterAdminEmail && (user.role !== "MASTER_ADMIN" || user.nickname !== "UluZeus")) {
      const promotedUser = await prisma.user.update({
        where: { id: user.id },
        data: { role: "MASTER_ADMIN", nickname: "UluZeus" },
        select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true, isActive: true },
      });

      return {
        id: promotedUser.id,
        name: promotedUser.name,
        nickname: promotedUser.nickname,
        displayNameMode: promotedUser.displayNameMode,
        email: promotedUser.email,
        role: promotedUser.role,
      };
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
