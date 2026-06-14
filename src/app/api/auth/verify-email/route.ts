import { NextRequest, NextResponse } from "next/server";
import { createSession } from "@/lib/auth";
import { hashEmailVerificationToken } from "@/lib/email-verification";
import { getSafeLocale } from "@/i18n/config";
import { prisma } from "@/lib/prisma";
import { getRequestOrigin } from "@/lib/site-url";

function getRedirect(request: NextRequest, localeValue: string | null, path: string, message?: string) {
  const locale = getSafeLocale(localeValue ?? "tr");
  const url = new URL(`/${locale}/${path}`, getRequestOrigin(request));

  if (message) {
    url.searchParams.set("message", message);
  }

  return url;
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const locale = request.nextUrl.searchParams.get("locale");

  if (!token) {
    return NextResponse.redirect(getRedirect(request, locale, "giris", "Doğrulama bağlantısı geçersiz."));
  }

  const tokenHash = hashEmailVerificationToken(token);
  const now = new Date();

  const user = await prisma.user.findFirst({
    where: {
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: {
        gt: now,
      },
    },
    select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true },
  });

  if (!user) {
    return NextResponse.redirect(getRedirect(request, locale, "giris", "Doğrulama bağlantısı geçersiz veya süresi dolmuş."));
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      isActive: true,
      emailVerifiedAt: now,
      emailVerificationTokenHash: null,
      emailVerificationExpiresAt: null,
      emailVerificationSentAt: null,
    },
  });

  await createSession(user);

  return NextResponse.redirect(
    getRedirect(
      request,
      locale,
      "panel",
      "Hesabın doğrulandı ve aktif edildi. Hoş geldin!",
    ),
  );
}
