"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import path from "path";
import { canAccessAdmin, createSession, destroySession, getDisplayName, getSessionUser, masterAdminEmail } from "@/lib/auth";
import { sendLatestMacroReportEmail } from "@/lib/ai-market/agent/morning-report-email";
import { buildEmailVerificationUrl, buildWelcomeVerificationEmail, createEmailVerificationToken } from "@/lib/email-verification";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getSafeLocale } from "@/i18n/config";
import { getLiveMarketItem } from "@/lib/live-market";
import { cashToUsd, ensureVirtualAccount, getSafePortfolioPriceUsd, usdToCash } from "@/lib/portfolio";
import type { CashMode, CompetitionPeriodType, DisplayNameMode, LeagueType, TradeSide } from "@/generated/prisma/enums";
import { getFriendPairKey } from "@/lib/friends";
import { getUniqueInviteCode, getUniqueLeagueSlug, leagueTypes } from "@/lib/leagues";
import { awardBadge, evaluateTradeBadges } from "@/lib/badges";
import { awardLeaderBadgesForActivePeriods, competitionPeriodTypes } from "@/lib/competition-periods";
import { defaultVisualSettings, getSettingDefinition } from "@/lib/site-visual-settings";
import { adSlots } from "@/lib/ads";
import { isManagedContentType } from "@/lib/managed-content";

export type TradeActionState = {
  ok: boolean;
  message: string;
};

const initialTradeActionState: TradeActionState = {
  ok: false,
  message: "",
};

type TradePricePosition = {
  averagePriceUsd: number;
} | null;

type AdminUploadKind = "image" | "video";

const maxAdminUploadBytes = 100 * 1024 * 1024;
const adminUploadRoot = path.join(process.cwd(), "public", "uploads", "admin");
const allowedAdminUploadTypes: Record<AdminUploadKind, Record<string, string>> = {
  image: {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
  },
  video: {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/ogg": "ogv",
    "video/quicktime": "mov",
  },
};

function normalizeEmail(email: FormDataEntryValue | null) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeOptionalUrl(value: FormDataEntryValue | null) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  if (text.startsWith("/")) {
    return text;
  }

  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:" ? text : null;
  } catch {
    return null;
  }
}

function normalizeOptionalDateTime(value: FormDataEntryValue | null) {
  const text = normalizeText(value);

  if (!text) {
    return null;
  }

  const date = new Date(text);

  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeOptionalNumber(value: FormDataEntryValue | null, fallback = 0) {
  const text = normalizeText(value);

  if (!text) {
    return fallback;
  }

  const number = Number(text);

  return Number.isFinite(number) ? number : fallback;
}

async function saveAdminUpload(locale: FormDataEntryValue | null, value: FormDataEntryValue | null, kind: AdminUploadKind) {
  if (!value || typeof value === "string" || value.size === 0) {
    return null;
  }

  const extension = allowedAdminUploadTypes[kind][value.type];

  if (!extension) {
    const message = kind === "image"
      ? "Yalnızca JPG, PNG, WebP, GIF veya SVG görsel yükleyebilirsin."
      : "Yalnızca MP4, WebM, OGG veya MOV video yükleyebilirsin.";

    redirect(getRedirect(locale, "admin", message));
  }

  if (value.size > maxAdminUploadBytes) {
    redirect(getRedirect(locale, "admin", "Yüklenen dosya 100 MB sınırını aşamaz."));
  }

  const uploadedAt = new Date();
  const folder = path.join(
    adminUploadRoot,
    String(uploadedAt.getFullYear()),
    String(uploadedAt.getMonth() + 1).padStart(2, "0"),
  );
  const filename = `${uploadedAt.getTime()}-${randomUUID()}.${extension}`;
  const bytes = Buffer.from(await value.arrayBuffer());

  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, filename), bytes);

  return `/uploads/admin/${uploadedAt.getFullYear()}/${String(uploadedAt.getMonth() + 1).padStart(2, "0")}/${filename}`;
}

function normalizeVisualSettingValue(value: string, type: "TEXT" | "COLOR" | "IMAGE_URL" | "BOOLEAN") {
  if (type === "COLOR") {
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "";
  }

  if (type === "IMAGE_URL") {
    if (!value) {
      return "";
    }

    if (value.startsWith("/")) {
      return value;
    }

    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:" ? value : "";
    } catch {
      return "";
    }
  }

  return value;
}

function getRedirect(localeValue: FormDataEntryValue | null, path: string, error?: string, message?: string) {
  const locale = getSafeLocale(String(localeValue ?? "tr"));
  const params = new URLSearchParams();

  if (error) {
    params.set("error", error);
  }

  if (message) {
    params.set("message", message);
  }

  const query = params.toString() ? `?${params.toString()}` : "";

  return `/${locale}/${path}${query}`;
}

function revalidatePortfolioViews(localeValue: FormDataEntryValue | null) {
  const locale = getSafeLocale(String(localeValue ?? "tr"));

  revalidatePath(`/${locale}`);
  revalidatePath(`/${locale}/panel`);
  revalidatePath(`/${locale}/islem-yap`);
  revalidatePath(`/${locale}/liderlik-tablosu`);
}

function revalidateSocialViews(localeValue: FormDataEntryValue | null) {
  const locale = getSafeLocale(String(localeValue ?? "tr"));

  revalidatePath(`/${locale}/topluluk`);
  revalidatePath(`/${locale}/panel`);
  revalidatePath(`/${locale}/ligler`);
  revalidatePath(`/${locale}/liderlik-tablosu`);
}

function revalidateAdminManagedViews(localeValue: FormDataEntryValue | null, contentLocaleValue?: FormDataEntryValue | null) {
  const locale = getSafeLocale(String(localeValue ?? "tr"));
  const contentLocale = getSafeLocale(String(contentLocaleValue ?? locale));
  const locales = new Set([locale, contentLocale]);

  for (const currentLocale of locales) {
    revalidatePath(`/${currentLocale}`);
    revalidatePath(`/${currentLocale}/admin`);
    revalidatePath(`/${currentLocale}/blog`);
    revalidatePath(`/${currentLocale}/egitim`);
    revalidatePath(`/${currentLocale}/iletisim`);
    revalidatePath(`/${currentLocale}/islem-yap`);
  }
}

function getSafeTradePriceUsd(marketItem: { priceUsd: number; source: string }, position: TradePricePosition) {
  if (position) {
    return getSafePortfolioPriceUsd({ ...position, symbol: "" }, marketItem);
  }

  return marketItem.priceUsd;
}

async function requireSession(locale: FormDataEntryValue | null, returnPath: string, message: string) {
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(getRedirect(locale, returnPath, message));
  }

  return sessionUser;
}

async function requireAdminSession(locale: FormDataEntryValue | null) {
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdmin(sessionUser.role)) {
    redirect(getRedirect(locale, "admin", "Bu işlem için admin yetkisi gerekir."));
  }

  return sessionUser;
}

export async function registerAction(formData: FormData) {
  const locale = formData.get("locale");
  const name = normalizeText(formData.get("name"));
  const email = normalizeEmail(formData.get("email"));
  const requestedNickname = normalizeText(formData.get("nickname"));
  const displayNameMode = String(formData.get("displayNameMode") ?? "REAL_NAME") as DisplayNameMode;
  const password = String(formData.get("password") ?? "");
  const kvkkAccepted = formData.get("kvkkAccepted") === "on";
  const termsAccepted = formData.get("termsAccepted") === "on";
  const noAdviceAccepted = formData.get("noAdviceAccepted") === "on";
  const electronicConsent = formData.get("electronicConsent") === "on";

  if (!name || !email || password.length < 8) {
    redirect(getRedirect(locale, "kayit", "Ad, e-posta ve en az 8 karakterli şifre zorunludur."));
  }

  if (!kvkkAccepted || !termsAccepted || !noAdviceAccepted) {
    redirect(getRedirect(locale, "kayit", "Zorunlu onay kutularını işaretlemelisiniz."));
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });

  if (existingUser) {
    redirect(getRedirect(locale, "kayit", "Bu e-posta adresi ile kayıtlı bir kullanıcı var."));
  }

  const now = new Date();
  const passwordHash = await bcrypt.hash(password, 12);
  const role = email === masterAdminEmail ? "MASTER_ADMIN" : "USER";
  const nickname = email === masterAdminEmail ? "UluZeus" : requestedNickname || null;
  const safeDisplayNameMode = displayNameMode === "NICKNAME" && nickname ? "NICKNAME" : "REAL_NAME";
  const { token, tokenHash, expiresAt } = createEmailVerificationToken();

  const user = await prisma.user.create({
    data: {
      name,
      nickname,
      displayNameMode: safeDisplayNameMode,
      email,
      passwordHash,
      isActive: false,
      emailVerifiedAt: null,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationSentAt: now,
      role,
      kvkkDisclosureAccepted: true,
      kvkkDisclosureAcceptedAt: now,
      termsAccepted: true,
      termsAcceptedAt: now,
      noInvestmentAdviceAccepted: true,
      noInvestmentAdviceAcceptedAt: now,
      electronicCommunicationConsent: electronicConsent,
      electronicCommunicationConsentAt: electronicConsent ? now : null,
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

  try {
    const verificationUrl = buildEmailVerificationUrl(token, getSafeLocale(String(locale ?? "tr")));
    const { subject, text, html } = buildWelcomeVerificationEmail({ name, verificationUrl });

    await sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  } catch (error) {
    await prisma.user.delete({ where: { id: user.id } });
    redirect(getRedirect(locale, "kayit", error instanceof Error ? error.message : "Doğrulama e-postası gönderilemedi."));
  }

  redirect(
    getRedirect(
      locale,
      "giris",
      undefined,
      "Hesabın oluşturuldu. E-posta kutundaki doğrulama bağlantısına tıklayarak hesabını aktif edebilirsin.",
    ),
  );
}

export async function loginAction(formData: FormData) {
  const locale = formData.get("locale");
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect(getRedirect(locale, "giris", "E-posta ve şifre zorunludur."));
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      nickname: true,
      displayNameMode: true,
      email: true,
      passwordHash: true,
      role: true,
      isActive: true,
    },
  });

  if (!user) {
    redirect(getRedirect(locale, "giris", "E-posta veya şifre hatalı."));
  }

  if (!user.passwordHash) {
    redirect(getRedirect(locale, "giris", "Bu hesap Google ile giriş için oluşturulmuş. Lütfen Google ile giriş yapın."));
  }

  if (!user.isActive) {
    redirect(
      getRedirect(
        locale,
        "giris",
        undefined,
        "Hesabın henüz aktif değil. E-posta kutundaki doğrulama bağlantısına tıklayarak hesabını aktif et.",
      ),
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    redirect(getRedirect(locale, "giris", "E-posta veya şifre hatalı."));
  }

  await createSession({
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    displayNameMode: user.displayNameMode,
    email: user.email,
    role: user.role,
  });

  redirect(getRedirect(locale, "panel"));
}

export async function logoutAction(formData: FormData) {
  const locale = formData.get("locale");
  await destroySession();
  redirect(getRedirect(locale, "giris"));
}

export async function tradeAction(previousState: TradeActionState = initialTradeActionState, formData: FormData): Promise<TradeActionState> {
  void previousState;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    return { ok: false, message: "Sanal işlem yapabilmek için önce giriş yapmalısın." };
  }

  const submittedUserId = String(formData.get("userId") ?? "");
  const locale = formData.get("locale");
  const userId = sessionUser.id;
  const symbol = String(formData.get("symbol") ?? "");
  const side = String(formData.get("side") ?? "") as TradeSide;
  const amountUsd = Number(formData.get("amountUsd") ?? 0);
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const cookieStore = await cookies();
  const nonceCookieName = `enbilir_trade_${userId}`;
  const marketItem = await getLiveMarketItem(symbol);

  if (idempotencyKey && cookieStore.get(nonceCookieName)?.value === idempotencyKey) {
    return { ok: true, message: "Bu işlem zaten uygulanmıştı; tekrar yazılmadı." };
  }

  if (submittedUserId && submittedUserId !== sessionUser.id) {
    return { ok: false, message: "Bu işlemi yalnızca kendi hesabın için yapabilirsin." };
  }

  if (!userId || !marketItem || !["BUY", "SELL"].includes(side) || !Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, message: "Lütfen ürün, işlem yönü ve pozitif USD tutarı seç." };
  }

  const existingPosition = await prisma.portfolioPosition.findUnique({
    where: { userId_symbol: { userId, symbol } },
  });
  const tradePriceUsd = getSafeTradePriceUsd(marketItem, existingPosition);

  if (!Number.isFinite(tradePriceUsd) || tradePriceUsd <= 0) {
    return { ok: false, message: "Seçilen ürün için geçerli fiyat bulunamadı." };
  }

  const account = await ensureVirtualAccount(userId);
  const cashValueUsd = cashToUsd(account.cashAmount, account.cashMode);

  if (side === "BUY" && amountUsd > cashValueUsd) {
    return { ok: false, message: "Bu alım için yeterli sanal nakdin yok." };
  }

  const quantity = amountUsd / tradePriceUsd;

  if (side === "SELL") {
    if (!existingPosition || existingPosition.quantity <= 0) {
      return { ok: false, message: "Satış işlemi yapılamaz. Seçtiğiniz ürün portföyünüzde bulunmuyor." };
    }

    if (existingPosition.quantity + 0.000001 < quantity) {
      return { ok: false, message: "Satmak istediğiniz miktar portföyünüzdeki miktardan fazla." };
    }
  }

  let transactionError: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      const latestAccount = await tx.virtualAccount.findUniqueOrThrow({ where: { userId } });
      const latestCashUsd = cashToUsd(latestAccount.cashAmount, latestAccount.cashMode);

      if (side === "BUY" && amountUsd > latestCashUsd) {
        throw new Error("Bu alım için yeterli sanal nakdin yok.");
      }

      const nextCashUsd = side === "BUY" ? latestCashUsd - amountUsd : latestCashUsd + amountUsd;
      const currentPosition = await tx.portfolioPosition.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });
      const currentTradePriceUsd = getSafeTradePriceUsd(marketItem, currentPosition);
      const currentQuantity = amountUsd / currentTradePriceUsd;

      if (side === "SELL") {
        if (!currentPosition || currentPosition.quantity <= 0) {
          throw new Error("Satış işlemi yapılamaz. Seçtiğiniz ürün portföyünüzde bulunmuyor.");
        }

        if (currentPosition.quantity + 0.000001 < currentQuantity) {
          throw new Error("Satmak istediğiniz miktar portföyünüzdeki miktardan fazla.");
        }
      }

      await tx.virtualAccount.update({
        where: { userId },
        data: {
          cashAmount: usdToCash(nextCashUsd, latestAccount.cashMode),
        },
      });

      if (side === "BUY") {
        if (currentPosition) {
          const totalQuantity = currentPosition.quantity + currentQuantity;
          const totalCost = currentPosition.quantity * currentPosition.averagePriceUsd + amountUsd;

          await tx.portfolioPosition.update({
            where: { userId_symbol: { userId, symbol } },
            data: {
              quantity: totalQuantity,
              averagePriceUsd: totalCost / totalQuantity,
            },
          });
        } else {
          await tx.portfolioPosition.create({
            data: {
              userId,
              symbol,
              name: marketItem.name,
              market: marketItem.market,
              quantity: currentQuantity,
              averagePriceUsd: currentTradePriceUsd,
            },
          });
        }
      } else if (currentPosition) {
        const nextQuantity = currentPosition.quantity - currentQuantity;

        if (nextQuantity <= 0.000001) {
          await tx.portfolioPosition.delete({ where: { userId_symbol: { userId, symbol } } });
        } else {
          await tx.portfolioPosition.update({
            where: { userId_symbol: { userId, symbol } },
            data: { quantity: nextQuantity },
          });
        }
      }

      await tx.virtualTrade.create({
        data: {
          userId,
          symbol,
          name: marketItem.name,
          market: marketItem.market,
          side,
          quantity: currentQuantity,
          priceUsd: currentTradePriceUsd,
          totalUsd: amountUsd,
        },
      });
    });
  } catch (error) {
    transactionError = error instanceof Error ? error.message : "İşlem uygulanamadı.";
  }

  if (transactionError) {
    return { ok: false, message: transactionError };
  }

  if (idempotencyKey) {
    cookieStore.set(nonceCookieName, idempotencyKey, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
  }

  try {
    await evaluateTradeBadges(userId);
  } catch {
    // Badge calculation is secondary; a completed trade must still return a success state.
  }

  revalidatePortfolioViews(locale);

  return {
    ok: true,
    message: side === "BUY" ? "Alım işlemi başarıyla gerçekleşti." : "Satış işlemi başarıyla gerçekleşti.",
  };
}

export async function updateCashModeAction(formData: FormData) {
  const locale = formData.get("locale");
  const sessionUser = await requireSession(locale, "giris", "Nakit tercihini değiştirmek için önce giriş yapmalısın.");
  const submittedUserId = String(formData.get("userId") ?? "");
  const userId = sessionUser.id;
  const cashMode = String(formData.get("cashMode") ?? "USD") as CashMode;

  if (submittedUserId && submittedUserId !== sessionUser.id) {
    redirect(getRedirect(locale, "islem-yap", "Nakit tercihini yalnızca kendi hesabın için değiştirebilirsin."));
  }

  if (!userId || !["USD", "EUR", "CHF", "TRY_REPO"].includes(cashMode)) {
    redirect(getRedirect(locale, "islem-yap", "Lütfen geçerli bir nakit tercihi seç."));
  }

  const account = await ensureVirtualAccount(userId);
  const cashValueUsd = cashToUsd(account.cashAmount, account.cashMode);

  await prisma.virtualAccount.update({
    where: { userId },
    data: {
      cashMode,
      cashAmount: usdToCash(cashValueUsd, cashMode),
      repoLastAccruedAt: cashMode === "TRY_REPO" ? new Date() : null,
    },
  });

  revalidatePortfolioViews(locale);

  redirect(getRedirect(locale, "islem-yap"));
}

export async function updateProfileDisplayAction(formData: FormData) {
  const locale = formData.get("locale");
  const sessionUser = await requireSession(locale, "giris", "Profil tercihini değiştirmek için önce giriş yapmalısın.");
  const submittedUserId = String(formData.get("userId") ?? "");
  const userId = sessionUser.id;
  const nickname = normalizeText(formData.get("nickname")) || null;
  const displayNameMode = String(formData.get("displayNameMode") ?? "REAL_NAME") as DisplayNameMode;

  if (submittedUserId && submittedUserId !== sessionUser.id) {
    redirect(getRedirect(locale, "panel", "Profil bilgilerini yalnızca kendi hesabın için değiştirebilirsin."));
  }

  if (!userId || !["REAL_NAME", "NICKNAME"].includes(displayNameMode)) {
    redirect(getRedirect(locale, "panel", "Lütfen geçerli bir görünen ad tercihi seç."));
  }

  if (displayNameMode === "NICKNAME" && !nickname) {
    redirect(getRedirect(locale, "panel", "Rumuzla görünmek için önce bir rumuz yazmalısın."));
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      nickname,
      displayNameMode,
    },
  });

  redirect(getRedirect(locale, "panel"));
}

export async function createAdPlacementAction(formData: FormData) {
  const locale = formData.get("locale");
  await requireAdminSession(locale);
  const slot = normalizeText(formData.get("slot"));
  const title = normalizeText(formData.get("title"));
  const body = normalizeText(formData.get("body"));
  const uploadedImageUrl = await saveAdminUpload(locale, formData.get("imageFile"), "image");
  const uploadedVideoUrl = await saveAdminUpload(locale, formData.get("videoFile"), "video");
  const imageUrl = uploadedImageUrl ?? normalizeOptionalUrl(formData.get("imageUrl"));
  const videoUrl = uploadedVideoUrl ?? normalizeOptionalUrl(formData.get("videoUrl"));
  const linkUrl = normalizeOptionalUrl(formData.get("linkUrl"));
  const linkLabel = normalizeText(formData.get("linkLabel")) || null;
  const displaySeconds = Math.max(Number(formData.get("displaySeconds") ?? 8), 1);
  const priority = normalizeOptionalNumber(formData.get("priority"));
  const startsAt = normalizeOptionalDateTime(formData.get("startsAt"));
  const endsAt = normalizeOptionalDateTime(formData.get("endsAt"));
  const isActive = formData.get("isActive") === "on";

  if (!adSlots.includes(slot as (typeof adSlots)[number]) || !title || !body) {
    redirect(getRedirect(locale, "admin", "Reklam alanı, başlık ve metin zorunludur."));
  }

  if ((normalizeText(formData.get("imageUrl")) && !imageUrl) || (normalizeText(formData.get("videoUrl")) && !videoUrl) || (normalizeText(formData.get("linkUrl")) && !linkUrl)) {
    redirect(getRedirect(locale, "admin", "Görsel, video veya bağlantı adresi geçerli bir http/https URL ya da site içi / yol olmalıdır."));
  }

  if (startsAt && endsAt && startsAt >= endsAt) {
    redirect(getRedirect(locale, "admin", "Reklam başlangıç tarihi bitiş tarihinden önce olmalıdır."));
  }

  await prisma.adPlacement.create({
    data: {
      slot,
      title,
      body,
      imageUrl,
      videoUrl,
      linkUrl,
      linkLabel,
      displaySeconds,
      priority: Number.isFinite(priority) ? priority : 0,
      startsAt,
      endsAt,
      isActive,
    },
  });

  revalidateAdminManagedViews(locale);
  redirect(getRedirect(locale, "admin"));
}

export async function updateAdPlacementAction(formData: FormData) {
  const locale = formData.get("locale");
  await requireAdminSession(locale);
  const id = String(formData.get("id") ?? "");
  const slot = normalizeText(formData.get("slot"));
  const title = normalizeText(formData.get("title"));
  const body = normalizeText(formData.get("body"));
  const uploadedImageUrl = await saveAdminUpload(locale, formData.get("imageFile"), "image");
  const uploadedVideoUrl = await saveAdminUpload(locale, formData.get("videoFile"), "video");
  const imageUrl = uploadedImageUrl ?? normalizeOptionalUrl(formData.get("imageUrl"));
  const videoUrl = uploadedVideoUrl ?? normalizeOptionalUrl(formData.get("videoUrl"));
  const linkUrl = normalizeOptionalUrl(formData.get("linkUrl"));
  const linkLabel = normalizeText(formData.get("linkLabel")) || null;
  const displaySeconds = Math.max(Number(formData.get("displaySeconds") ?? 8), 1);
  const priority = normalizeOptionalNumber(formData.get("priority"));
  const startsAt = normalizeOptionalDateTime(formData.get("startsAt"));
  const endsAt = normalizeOptionalDateTime(formData.get("endsAt"));
  const isActive = formData.get("isActive") === "on";

  if (!id || !adSlots.includes(slot as (typeof adSlots)[number]) || !title || !body) {
    redirect(getRedirect(locale, "admin", "Reklam kaydı, alanı, başlık ve metin zorunludur."));
  }

  if ((normalizeText(formData.get("imageUrl")) && !imageUrl) || (normalizeText(formData.get("videoUrl")) && !videoUrl) || (normalizeText(formData.get("linkUrl")) && !linkUrl)) {
    redirect(getRedirect(locale, "admin", "Görsel, video veya bağlantı adresi geçerli bir http/https URL ya da site içi / yol olmalıdır."));
  }

  if (startsAt && endsAt && startsAt >= endsAt) {
    redirect(getRedirect(locale, "admin", "Reklam başlangıç tarihi bitiş tarihinden önce olmalıdır."));
  }

  await prisma.adPlacement.update({
    where: { id },
    data: {
      slot,
      title,
      body,
      imageUrl,
      videoUrl,
      linkUrl,
      linkLabel,
      displaySeconds,
      priority: Number.isFinite(priority) ? priority : 0,
      startsAt,
      endsAt,
      isActive,
    },
  });

  revalidateAdminManagedViews(locale);
  redirect(getRedirect(locale, "admin"));
}

export async function toggleAdPlacementAction(formData: FormData) {
  const locale = formData.get("locale");
  await requireAdminSession(locale);
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("nextActive") === "true";

  if (!id) {
    redirect(getRedirect(locale, "admin", "Reklam kaydı bulunamadı."));
  }

  await prisma.adPlacement.update({
    where: { id },
    data: { isActive: nextActive },
  });

  revalidateAdminManagedViews(locale);
  redirect(getRedirect(locale, "admin"));
}

export async function upsertManagedContentAction(formData: FormData) {
  const locale = formData.get("locale");
  await requireAdminSession(locale);
  const code = normalizeText(formData.get("code"));
  const title = normalizeText(formData.get("title"));
  const body = normalizeText(formData.get("body"));
  const isActive = formData.get("isActive") === "on";

  if (!code || !title || !body) {
    redirect(getRedirect(locale, "admin", "Sayfa kodu, başlık ve içerik zorunludur."));
  }

  await prisma.managedContentPage.upsert({
    where: { code },
    create: { code, title, body, isActive },
    update: { title, body, isActive },
  });

  revalidateAdminManagedViews(locale);
  redirect(getRedirect(locale, "admin"));
}

export async function upsertManagedContentItemAction(formData: FormData) {
  const locale = formData.get("locale");
  await requireAdminSession(locale);
  const id = normalizeText(formData.get("id"));
  const type = normalizeText(formData.get("type"));
  const contentLocale = getSafeLocale(String(formData.get("contentLocale") ?? locale ?? "tr"));
  const title = normalizeText(formData.get("title"));
  const excerpt = normalizeText(formData.get("excerpt")) || null;
  const body = normalizeText(formData.get("body"));
  const uploadedImageUrl = await saveAdminUpload(locale, formData.get("imageFile"), "image");
  const uploadedVideoUrl = await saveAdminUpload(locale, formData.get("videoFile"), "video");
  const imageUrl = uploadedImageUrl ?? normalizeOptionalUrl(formData.get("imageUrl"));
  const videoUrl = uploadedVideoUrl ?? normalizeOptionalUrl(formData.get("videoUrl"));
  const linkUrl = normalizeOptionalUrl(formData.get("linkUrl"));
  const linkLabel = normalizeText(formData.get("linkLabel")) || null;
  const sortOrder = normalizeOptionalNumber(formData.get("sortOrder"));
  const publishedAt = normalizeOptionalDateTime(formData.get("publishedAt"));
  const isFeatured = formData.get("isFeatured") === "on";
  const isActive = formData.get("isActive") === "on";

  if (!isManagedContentType(type) || !title || !body) {
    redirect(getRedirect(locale, "admin", "İçerik türü, başlık ve metin zorunludur."));
  }

  if ((normalizeText(formData.get("imageUrl")) && !imageUrl) || (normalizeText(formData.get("videoUrl")) && !videoUrl) || (normalizeText(formData.get("linkUrl")) && !linkUrl)) {
    redirect(getRedirect(locale, "admin", "Görsel, video veya bağlantı adresi geçerli bir http/https URL ya da site içi / yol olmalıdır."));
  }

  const data = {
    type,
    locale: contentLocale,
    title,
    excerpt,
    body,
    imageUrl,
    videoUrl,
    linkUrl,
    linkLabel,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    publishedAt,
    isFeatured,
    isActive,
  };

  if (id) {
    await prisma.managedContentItem.update({
      where: { id },
      data,
    });
  } else {
    await prisma.managedContentItem.create({ data });
  }

  revalidateAdminManagedViews(locale, contentLocale);
  redirect(getRedirect(locale, "admin"));
}

export async function toggleManagedContentItemAction(formData: FormData) {
  const locale = formData.get("locale");
  await requireAdminSession(locale);
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("nextActive") === "true";
  const contentLocale = formData.get("contentLocale");

  if (!id) {
    redirect(getRedirect(locale, "admin", "İçerik kaydı bulunamadı."));
  }

  await prisma.managedContentItem.update({
    where: { id },
    data: { isActive: nextActive },
  });

  revalidateAdminManagedViews(locale, contentLocale);
  redirect(getRedirect(locale, "admin"));
}

export async function updateSiteVisualSettingsAction(formData: FormData) {
  const locale = formData.get("locale");
  await requireAdminSession(locale);

  for (const setting of defaultVisualSettings) {
    const submittedValue = formData.get(setting.key);
    const definition = getSettingDefinition(setting.key);
    let value = setting.type === "BOOLEAN" ? "false" : normalizeText(submittedValue);

    if (setting.type === "BOOLEAN") {
      value = submittedValue === "on" ? "true" : "false";
    }

    if (setting.type === "TEXT" && setting.key === "whatsappButtonVariant" && !["text", "image"].includes(value)) {
      value = "text";
    }

    if (!definition) {
      continue;
    }

    if (setting.type === "IMAGE_URL") {
      const uploadedImageUrl = await saveAdminUpload(locale, formData.get(`${setting.key}File`), "image");

      if (uploadedImageUrl) {
        value = uploadedImageUrl;
      }
    }

    value = normalizeVisualSettingValue(value, definition.type);

    if (definition.type === "COLOR" && !value) {
      value = definition.value;
    }

    await prisma.siteVisualSetting.upsert({
      where: { key: setting.key },
      create: {
        key: setting.key,
        title: setting.title,
        value,
        type: setting.type,
        description: setting.description,
      },
      update: {
        title: setting.title,
        value,
        type: setting.type,
        description: setting.description,
      },
    });
  }

  redirect(getRedirect(locale, "admin"));
}

export async function toggleBadgeAction(formData: FormData) {
  const locale = formData.get("locale");
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("nextActive") === "true";
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdmin(sessionUser.role)) {
    redirect(getRedirect(locale, "admin", "Rozet yönetimi için admin yetkisi gerekir."));
  }

  if (!id) {
    redirect(getRedirect(locale, "admin", "Rozet kaydı bulunamadı."));
  }

  await prisma.badge.update({
    where: { id },
    data: { isActive: nextActive },
  });

  redirect(getRedirect(locale, "admin"));
}

export async function createCompetitionPeriodAction(formData: FormData) {
  const locale = formData.get("locale");
  const type = String(formData.get("type") ?? "WEEKLY") as CompetitionPeriodType;
  const name = normalizeText(formData.get("name"));
  const startsAt = new Date(String(formData.get("startsAt") ?? ""));
  const endsAt = new Date(String(formData.get("endsAt") ?? ""));
  const isActive = formData.get("isActive") === "on";
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdmin(sessionUser.role)) {
    redirect(getRedirect(locale, "admin", "Yarışma dönemi yönetimi için admin yetkisi gerekir."));
  }

  if (!competitionPeriodTypes.includes(type) || !name || Number.isNaN(startsAt.getTime()) || Number.isNaN(endsAt.getTime())) {
    redirect(getRedirect(locale, "admin", "Dönem türü, adı ve tarihleri zorunludur."));
  }

  if (startsAt >= endsAt) {
    redirect(getRedirect(locale, "admin", "Başlangıç tarihi bitiş tarihinden önce olmalıdır."));
  }

  await prisma.competitionPeriod.create({
    data: {
      type,
      name,
      startsAt,
      endsAt,
      isActive,
    },
  });

  redirect(getRedirect(locale, "admin"));
}

export async function toggleCompetitionPeriodAction(formData: FormData) {
  const locale = formData.get("locale");
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("nextActive") === "true";
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdmin(sessionUser.role)) {
    redirect(getRedirect(locale, "admin", "Yarışma dönemi yönetimi için admin yetkisi gerekir."));
  }

  if (!id) {
    redirect(getRedirect(locale, "admin", "Yarışma dönemi bulunamadı."));
  }

  await prisma.competitionPeriod.update({
    where: { id },
    data: { isActive: nextActive },
  });

  redirect(getRedirect(locale, "admin"));
}

export async function awardLeaderBadgesAction(formData: FormData) {
  const locale = formData.get("locale");
  const sessionUser = await getSessionUser();

  if (!sessionUser || !canAccessAdmin(sessionUser.role)) {
    redirect(getRedirect(locale, "admin", "Lider rozetleri için admin yetkisi gerekir."));
  }

  await awardLeaderBadgesForActivePeriods();
  redirect(getRedirect(locale, "admin"));
}

async function addFriendImmediately(userId: string, targetUserId: string) {
  const pairKey = getFriendPairKey(userId, targetUserId);
  const existingRequest = await prisma.friendRequest.findUnique({
    where: { pairKey },
    select: { id: true, status: true },
  });

  if (existingRequest?.status === "ACCEPTED") {
    return existingRequest.id;
  }

  const request = existingRequest
    ? await prisma.friendRequest.update({
        where: { id: existingRequest.id },
        data: {
          senderId: userId,
          receiverId: targetUserId,
          status: "ACCEPTED",
        },
        select: { id: true },
      })
    : await prisma.friendRequest.create({
        data: {
          pairKey,
          senderId: userId,
          receiverId: targetUserId,
          status: "ACCEPTED",
        },
        select: { id: true },
      });

  await Promise.all([
    awardBadge(userId, "FIRST_FRIEND", { requestId: request.id, mode: "instant" }),
    awardBadge(targetUserId, "FIRST_FRIEND", { requestId: request.id, mode: "instant" }),
  ]);

  return request.id;
}

export async function sendFriendRequestAction(formData: FormData) {
  const locale = formData.get("locale");
  const rawQuery = normalizeText(formData.get("query"));
  const query = rawQuery.toLowerCase();
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(getRedirect(locale, "giris", "Arkadaşlık isteği göndermek için giriş yapmalısın."));
  }

  if (!query) {
    redirect(getRedirect(locale, "panel", "E-posta veya rumuz girmelisin."));
  }

  const targetUser = await prisma.user.findFirst({
    where: {
      OR: [{ email: query }, { nickname: rawQuery }, { nickname: query }],
    },
    select: { id: true },
  });

  if (!targetUser) {
    redirect(getRedirect(locale, "panel", "Bu e-posta veya rumuz ile kullanıcı bulunamadı."));
  }

  if (targetUser.id === sessionUser.id) {
    redirect(getRedirect(locale, "panel", "Kendine arkadaşlık isteği gönderemezsin."));
  }

  await addFriendImmediately(sessionUser.id, targetUser.id);
  revalidateSocialViews(locale);

  redirect(getRedirect(locale, "panel"));
}

export async function sendCommunityFriendRequestAction(formData: FormData) {
  const locale = formData.get("locale");
  const sessionUser = await requireSession(locale, "giris", "Arkadaş eklemek için önce giriş yapmalısın.");
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!targetUserId || targetUserId === sessionUser.id) {
    redirect(getRedirect(locale, "topluluk", "Kendine arkadaşlık isteği gönderemezsin."));
  }

  const targetUser = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true } });

  if (!targetUser) {
    redirect(getRedirect(locale, "topluluk", "Kullanıcı bulunamadı."));
  }

  await addFriendImmediately(sessionUser.id, targetUserId);

  revalidateSocialViews(locale);
  redirect(getRedirect(locale, "topluluk"));
}

export async function removeCommunityFriendAction(formData: FormData) {
  const locale = formData.get("locale");
  const sessionUser = await requireSession(locale, "giris", "Arkadaş yönetimi için önce giriş yapmalısın.");
  const targetUserId = String(formData.get("targetUserId") ?? "");

  if (!targetUserId || targetUserId === sessionUser.id) {
    redirect(getRedirect(locale, "topluluk", "Bu arkadaşlık işlemi uygulanamaz."));
  }

  const pairKey = getFriendPairKey(sessionUser.id, targetUserId);
  const existingRequest = await prisma.friendRequest.findUnique({
    where: { pairKey },
    select: { id: true, status: true },
  });

  if (!existingRequest || existingRequest.status !== "ACCEPTED") {
    redirect(getRedirect(locale, "topluluk", "Aktif arkadaşlık kaydı bulunamadı."));
  }

  await prisma.friendRequest.update({
    where: { id: existingRequest.id },
    data: { status: "REJECTED" },
  });

  revalidateSocialViews(locale);
  redirect(getRedirect(locale, "topluluk"));
}

export async function respondFriendRequestAction(formData: FormData) {
  const locale = formData.get("locale");
  const requestId = String(formData.get("requestId") ?? "");
  const response = String(formData.get("response") ?? "");
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(getRedirect(locale, "giris", "Arkadaşlık isteğini yönetmek için giriş yapmalısın."));
  }

  if (!requestId || !["ACCEPTED", "REJECTED"].includes(response)) {
    redirect(getRedirect(locale, "panel", "Geçerli bir arkadaşlık yanıtı seçmelisin."));
  }

  const request = await prisma.friendRequest.findUnique({
    where: { id: requestId },
    select: { senderId: true, receiverId: true, status: true },
  });

  if (!request || request.receiverId !== sessionUser.id) {
    redirect(getRedirect(locale, "panel", "Bu arkadaşlık isteğini yönetme yetkin yok."));
  }

  if (request.status !== "PENDING") {
    redirect(getRedirect(locale, "panel", "Bu arkadaşlık isteği daha önce yanıtlanmış."));
  }

  await prisma.friendRequest.update({
    where: { id: requestId },
    data: { status: response === "ACCEPTED" ? "ACCEPTED" : "REJECTED" },
  });

  if (response === "ACCEPTED") {
    await Promise.all([
      awardBadge(sessionUser.id, "FIRST_FRIEND", { requestId }),
      awardBadge(request.senderId, "FIRST_FRIEND", { requestId }),
    ]);
  }

  redirect(getRedirect(locale, "panel"));
}

export async function createLeagueAction(formData: FormData) {
  const locale = formData.get("locale");
  const name = normalizeText(formData.get("name"));
  const description = normalizeText(formData.get("description")) || null;
  const type = String(formData.get("type") ?? "PRIVATE") as LeagueType;
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(getRedirect(locale, "giris", "Lig oluşturmak için giriş yapmalısın."));
  }

  if (!name || name.length < 3) {
    redirect(getRedirect(locale, "panel", "Lig adı en az 3 karakter olmalıdır."));
  }

  if (!leagueTypes.includes(type)) {
    redirect(getRedirect(locale, "panel", "Geçerli bir lig türü seçmelisin."));
  }

  const [slug, inviteCode] = await Promise.all([getUniqueLeagueSlug(name), getUniqueInviteCode()]);

  await prisma.$transaction(async (tx) => {
    const league = await tx.league.create({
      data: {
        name,
        slug,
        description,
        type,
        inviteCode,
        createdByUserId: sessionUser.id,
        memberships: {
          create: {
            userId: sessionUser.id,
            role: "OWNER",
          },
        },
      },
      select: { id: true },
    });

    return league;
  });

  await awardBadge(sessionUser.id, "FIRST_LEAGUE", { action: "create" });

  redirect(getRedirect(locale, "panel"));
}

export async function joinLeagueAction(formData: FormData) {
  const locale = formData.get("locale");
  const inviteCode = normalizeText(formData.get("inviteCode")).toUpperCase();
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(getRedirect(locale, "giris", "Lige katılmak için giriş yapmalısın."));
  }

  if (!inviteCode) {
    redirect(getRedirect(locale, "panel", "Davet kodu girmelisin."));
  }

  const league = await prisma.league.findUnique({
    where: { inviteCode },
    select: { id: true, isActive: true },
  });

  if (!league || !league.isActive) {
    redirect(getRedirect(locale, "panel", "Davet kodu geçersiz veya lig aktif değil."));
  }

  const existingMembership = await prisma.leagueMembership.findUnique({
    where: {
      leagueId_userId: {
        leagueId: league.id,
        userId: sessionUser.id,
      },
    },
    select: { id: true },
  });

  if (existingMembership) {
    redirect(getRedirect(locale, "panel", "Bu lige zaten üyesin."));
  }

  await prisma.leagueMembership.create({
    data: {
      leagueId: league.id,
      userId: sessionUser.id,
      role: "MEMBER",
    },
  });

  await awardBadge(sessionUser.id, "FIRST_LEAGUE", { action: "join", leagueId: league.id });

  redirect(getRedirect(locale, "panel"));
}

export async function changeLeagueAction(formData: FormData) {
  const locale = formData.get("locale");
  await requireSession(locale, "giris", "Lig değiştirmek için önce giriş yapmalısın.");
  redirect(getRedirect(locale, "topluluk", "Lig değişikliği yakında aktif olacak."));
}

export async function sendLatestMacroReportEmailAction(formData: FormData) {
  const locale = formData.get("locale");
  const sessionUser = await requireSession(locale, "giris", "Makro raporu e-posta ile almak için önce giriş yapmalısın.");
  const latestReport = await prisma.aiMarketReport.findFirst({
    where: { scope: "GLOBAL" },
    orderBy: { generatedAt: "desc" },
    select: { id: true },
  });

  if (!latestReport) {
    redirect(getRedirect(locale, "ai-piyasa-asistani/raporlar", "Henüz gönderilecek bir makro rapor yok."));
  }

  await sendLatestMacroReportEmail({
    reportId: latestReport.id,
    recipient: {
      email: sessionUser.email,
      name: getDisplayName(sessionUser),
    },
  });

  redirect(getRedirect(locale, "ai-piyasa-asistani/raporlar", undefined, "En son makro rapor e-posta adresine gönderildi."));
}
