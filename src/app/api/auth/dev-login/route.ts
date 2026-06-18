import { NextRequest, NextResponse } from "next/server";
import { getSafeLocale } from "@/i18n/config";
import { setSessionCookie } from "@/lib/auth";
import { ensureVirtualAccount } from "@/lib/portfolio";
import { prisma } from "@/lib/prisma";
import { getRequestOrigin } from "@/lib/site-url";

const DEV_LOGIN_EMAIL = "dev-user@enbilir.local";
const DEV_LOGIN_NAME = "Geliştirme Kullanıcısı";
const DEV_LOGIN_NICKNAME = "DevUser";

function getSafeReturnPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return null;
  }

  return value;
}

function getRedirect(request: NextRequest, localeValue: string | null, path: string, error?: string) {
  const locale = getSafeLocale(localeValue ?? "tr");
  const url = new URL(`/${locale}/${path}`, getRequestOrigin(request));

  if (error) {
    url.searchParams.set("error", error);
  }

  return url;
}

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const locale = getSafeLocale(request.nextUrl.searchParams.get("locale") ?? "tr");
  const returnTo = getSafeReturnPath(request.nextUrl.searchParams.get("returnTo"));

  try {
    const user = await prisma.user.upsert({
      where: { email: DEV_LOGIN_EMAIL },
      create: {
        name: DEV_LOGIN_NAME,
        nickname: DEV_LOGIN_NICKNAME,
        displayNameMode: "NICKNAME",
        email: DEV_LOGIN_EMAIL,
        passwordHash: null,
        isActive: true,
        emailVerifiedAt: new Date(),
        role: "USER",
        virtualAccount: {
          create: {
            cashAmount: 1_000_000,
            cashMode: "USD",
            baseCurrency: "USD",
          },
        },
      },
      update: {
        name: DEV_LOGIN_NAME,
        nickname: DEV_LOGIN_NICKNAME,
        displayNameMode: "NICKNAME",
        passwordHash: null,
        isActive: true,
        emailVerifiedAt: new Date(),
        role: "USER",
      },
      select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, role: true },
    });

    await ensureVirtualAccount(user.id);

    const response = NextResponse.redirect(new URL(returnTo || `/${locale}/panel`, getRequestOrigin(request)));
    await setSessionCookie(response, user);
    return response;
  } catch (error) {
    return NextResponse.redirect(
      getRedirect(request, locale, "giris", error instanceof Error ? error.message : "Geliştirme girişi tamamlanamadı."),
    );
  }
}
