"use server";

import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { canAccessAdmin, createSession, destroySession, getSessionUser, masterAdminEmail } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeLocale } from "@/i18n/config";
import { getLiveMarketItem } from "@/lib/live-market";
import { cashToUsd, ensureVirtualAccount, usdToCash } from "@/lib/portfolio";
import type { CashMode, CompetitionPeriodType, DisplayNameMode, LeagueType, TradeSide } from "@/generated/prisma/enums";
import { getFriendPairKey } from "@/lib/friends";
import { getUniqueInviteCode, getUniqueLeagueSlug, leagueTypes } from "@/lib/leagues";
import { awardBadge, evaluateTradeBadges } from "@/lib/badges";
import { awardLeaderBadgesForActivePeriods, competitionPeriodTypes } from "@/lib/competition-periods";
import { defaultVisualSettings, getSettingDefinition } from "@/lib/site-visual-settings";

export type TradeActionState = {
  ok: boolean;
  message: string;
};

const initialTradeActionState: TradeActionState = {
  ok: false,
  message: "",
};

function normalizeEmail(email: FormDataEntryValue | null) {
  return String(email ?? "").trim().toLowerCase();
}

function normalizeText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function normalizeVisualSettingValue(value: string, type: "TEXT" | "COLOR" | "IMAGE_URL" | "BOOLEAN") {
  if (type === "COLOR") {
    return /^#[0-9a-fA-F]{6}$/.test(value) ? value : "";
  }

  if (type === "IMAGE_URL") {
    if (!value) {
      return "";
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

function getRedirect(localeValue: FormDataEntryValue | null, path: string, error?: string) {
  const locale = getSafeLocale(String(localeValue ?? "tr"));
  const query = error ? `?error=${encodeURIComponent(error)}` : "";

  return `/${locale}/${path}${query}`;
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

  const user = await prisma.user.create({
    data: {
      name,
      nickname,
      displayNameMode: safeDisplayNameMode,
      email,
      passwordHash,
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

  await createSession(user);
  redirect(getRedirect(locale, "panel"));
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
    select: { id: true, name: true, nickname: true, displayNameMode: true, email: true, passwordHash: true, role: true },
  });

  if (!user) {
    redirect(getRedirect(locale, "giris", "E-posta veya şifre hatalı."));
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

  if (!Number.isFinite(marketItem.priceUsd) || marketItem.priceUsd <= 0) {
    return { ok: false, message: "Seçilen ürün için geçerli fiyat bulunamadı." };
  }

  const account = await ensureVirtualAccount(userId);
  const cashValueUsd = cashToUsd(account.cashAmount, account.cashMode);

  if (side === "BUY" && amountUsd > cashValueUsd) {
    return { ok: false, message: "Bu alım için yeterli sanal nakdin yok." };
  }

  const quantity = amountUsd / marketItem.priceUsd;

  if (side === "SELL") {
    const position = await prisma.portfolioPosition.findUnique({
      where: { userId_symbol: { userId, symbol } },
    });

    if (!position || position.quantity <= 0) {
      return { ok: false, message: "Satış işlemi yapılamaz. Seçtiğiniz ürün portföyünüzde bulunmuyor." };
    }

    if (position.quantity + 0.000001 < quantity) {
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

      if (side === "SELL") {
        if (!currentPosition || currentPosition.quantity <= 0) {
          throw new Error("Satış işlemi yapılamaz. Seçtiğiniz ürün portföyünüzde bulunmuyor.");
        }

        if (currentPosition.quantity + 0.000001 < quantity) {
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
          const totalQuantity = currentPosition.quantity + quantity;
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
              quantity,
              averagePriceUsd: marketItem.priceUsd,
            },
          });
        }
      } else if (currentPosition) {
        const nextQuantity = currentPosition.quantity - quantity;

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
          quantity,
          priceUsd: marketItem.priceUsd,
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
  const linkUrl = normalizeText(formData.get("linkUrl")) || null;
  const linkLabel = normalizeText(formData.get("linkLabel")) || null;
  const displaySeconds = Math.max(Number(formData.get("displaySeconds") ?? 8), 1);
  const priority = Number(formData.get("priority") ?? 0);
  const isActive = formData.get("isActive") === "on";

  if (!slot || !title || !body) {
    redirect(getRedirect(locale, "admin", "Reklam alanı, başlık ve metin zorunludur."));
  }

  await prisma.adPlacement.create({
    data: {
      slot,
      title,
      body,
      linkUrl,
      linkLabel,
      displaySeconds,
      priority: Number.isFinite(priority) ? priority : 0,
      isActive,
    },
  });

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

  const pairKey = getFriendPairKey(sessionUser.id, targetUser.id);
  const existingRequest = await prisma.friendRequest.findUnique({ where: { pairKey } });

  if (existingRequest) {
    redirect(getRedirect(locale, "panel", "Bu kullanıcı ile zaten bir arkadaşlık kaydı var."));
  }

  await prisma.friendRequest.create({
    data: {
      pairKey,
      senderId: sessionUser.id,
      receiverId: targetUser.id,
      status: "PENDING",
    },
  });

  redirect(getRedirect(locale, "panel"));
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
