"use server";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import path from "path";
import { canAccessAdmin, createSession, destroySession, getDisplayName, getSessionUser, revokeUserSessions } from "@/lib/auth";
import { getSelfServiceRegistrationDefaults } from "@/lib/auth-role-policy";
import { sendLatestMacroReportEmail } from "@/lib/ai-market/agent/morning-report-email";
import { macroReportEventTypes } from "@/lib/ai-market/report-event-types";
import { recordMacroReportEvent } from "@/lib/ai-market/report-events";
import { recordSiteAnalyticsEvent, siteAnalyticsEvents } from "@/lib/analytics";
import { buildEmailVerificationUrl, buildWelcomeVerificationEmail, createEmailVerificationToken } from "@/lib/email-verification";
import { assertEmailDeliveryConfigured, sendEmail } from "@/lib/email";
import { hashRegistrationPassword, resendPendingRegistrationEmail } from "@/lib/registration-email";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { getSafeLocale } from "@/i18n/config";
import { getLiveMarketItem } from "@/lib/live-market";
import { accrueRepoIfNeeded, cashToUsd, getCashModeUsdRate, usdToCash } from "@/lib/portfolio";
import type { CashMode, CompetitionPeriodType, DisplayNameMode, LeagueType, TradeSide } from "@/generated/prisma/enums";
import { getFriendPairKey } from "@/lib/friends";
import { getUniqueInviteCode, getUniqueLeagueSlug, isLeagueInviteTargetMatch, leagueTypes } from "@/lib/leagues";
import { awardBadge, evaluateTradeBadges } from "@/lib/badges";
import { awardLeaderBadgesForActivePeriods, competitionPeriodTypes } from "@/lib/competition-periods";
import { defaultVisualSettings, getSettingDefinition } from "@/lib/site-visual-settings";
import { adSlots } from "@/lib/ads";
import { isManagedContentType } from "@/lib/managed-content";
import { reconcileOnboardingCompletion } from "@/lib/onboarding";
import { getSafeLocaleReturnPath } from "@/lib/safe-navigation";
import { reviewVipSubscriptionClaim, submitVipSubscriptionClaim } from "@/lib/vip-subscription-claims";
import { consumeDurableRateLimit } from "@/lib/durable-rate-limit";
import { getRateLimitClientKey } from "@/lib/request-rate-limit";
import { detectAllowedChatUpload } from "@/lib/chat-upload-policy";
import { getPersistentAdminUploadDirectory } from "@/lib/media-storage";
import { appendAuditEvent } from "@/lib/audit-log";
import { calculateRealizedTradePnlDecimal, getVirtualExecutionCostsDecimal } from "@/lib/trade-accounting";
import { syncPortfolioPositionCorporateAction } from "@/lib/portfolio-corporate-actions";
import { isExecutableMarketQuote } from "@/lib/executable-quote";
import { updateElectronicCommunicationConsent } from "@/lib/communication-consent";
import { decimal } from "@/lib/decimal";
import { withSerializableTransaction } from "@/lib/serializable-transaction";

export type TradeActionState = {
  ok: boolean;
  message: string;
};

const initialTradeActionState: TradeActionState = {
  ok: false,
  message: "",
};

function getTradeIdempotencyCookieName(userId: string) {
  return process.env.NODE_ENV === "production"
    ? `__Host-enbilir_trade_${userId}`
    : `enbilir_trade_${userId}`;
}

type AdminUploadKind = "image" | "video";

const maxAdminUploadBytes = 100 * 1024 * 1024;

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

  const bytes = Buffer.from(await value.arrayBuffer());
  const format = detectAllowedChatUpload(bytes, value.type);

  if (!format || (kind === "image" ? format.kind !== "IMAGE" : format.kind !== "VIDEO")) {
    const message = kind === "image"
      ? "Yalnızca içeriği doğrulanmış JPG, PNG, WebP, GIF veya AVIF görsel yükleyebilirsin."
      : "Yalnızca içeriği doğrulanmış MP4 veya WebM video yükleyebilirsin.";

    redirect(getRedirect(locale, "admin", message));
  }

  if (value.size > maxAdminUploadBytes) {
    redirect(getRedirect(locale, "admin", "Yüklenen dosya 100 MB sınırını aşamaz."));
  }

  const uploadedAt = new Date();
  const folder = path.join(
    getPersistentAdminUploadDirectory(),
    String(uploadedAt.getFullYear()),
    String(uploadedAt.getMonth() + 1).padStart(2, "0"),
  );
  const filename = `${uploadedAt.getTime()}-${randomUUID()}${format.extension}`;

  await mkdir(folder, { recursive: true });
  await writeFile(path.join(folder, filename), bytes, { flag: "wx" });

  return `/api/admin/uploads/${uploadedAt.getFullYear()}/${String(uploadedAt.getMonth() + 1).padStart(2, "0")}/${filename}`;
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

function getRedirect(
  localeValue: FormDataEntryValue | null,
  path: string,
  error?: string,
  message?: string,
  extraParams?: Record<string, string | null | undefined>,
) {
  const locale = getSafeLocale(String(localeValue ?? "tr"));
  const params = new URLSearchParams();

  if (error) {
    params.set("error", error);
  }

  if (message) {
    params.set("message", message);
  }

  for (const [key, value] of Object.entries(extraParams ?? {})) {
    if (value) params.set(key, value);
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

  const registrationClientKey = getRateLimitClientKey(await headers());
  const registrationLimit = await consumeDurableRateLimit({
    scope: "auth-register",
    identity: `${registrationClientKey}:${email}`,
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    blockMs: 60 * 60 * 1000,
  });

  if (!registrationLimit.allowed) {
    redirect(getRedirect(locale, "kayit", "Çok fazla kayıt denemesi yapıldı. Lütfen daha sonra tekrar deneyin."));
  }

  const registrationTargetLimit = await consumeDurableRateLimit({
    scope: "auth-register-target",
    identity: email,
    maxAttempts: 5,
    windowMs: 60 * 60 * 1000,
    blockMs: 60 * 60 * 1000,
  });

  try {
    assertEmailDeliveryConfigured();
  } catch {
    redirect(getRedirect(locale, "kayit", "Doğrulama e-postası şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin."));
  }

  const existingUser = await prisma.user.findUnique({ where: { email } });
  const passwordHash = await hashRegistrationPassword(password, Boolean(existingUser));

  if (existingUser) {
    const safeLocale = getSafeLocale(String(locale ?? "tr"));

    try {
      await resendPendingRegistrationEmail({
        user: existingUser,
        locale: safeLocale,
        now: new Date(),
        targetAllowed: registrationTargetLimit.allowed,
        rotate: async ({
          userId,
          expectedTokenHash,
          expectedSentAt,
          tokenHash,
          expiresAt,
          sentAt,
        }) => {
          const result = await prisma.user.updateMany({
            where: {
              id: userId,
              isActive: false,
              emailVerifiedAt: null,
              emailVerificationTokenHash: expectedTokenHash,
              emailVerificationSentAt: expectedSentAt,
            },
            data: {
              emailVerificationTokenHash: tokenHash,
              emailVerificationExpiresAt: expiresAt,
              emailVerificationSentAt: sentAt,
            },
          });
          return result.count === 1;
        },
        rollback: async ({
          userId,
          failedTokenHash,
          failedSentAt,
          previousTokenHash,
          previousExpiresAt,
          previousSentAt,
        }) => {
          const result = await prisma.user.updateMany({
            where: {
              id: userId,
              emailVerificationTokenHash: failedTokenHash,
              emailVerificationSentAt: failedSentAt,
            },
            data: {
              emailVerificationTokenHash: previousTokenHash,
              emailVerificationExpiresAt: previousExpiresAt,
              emailVerificationSentAt: previousSentAt,
            },
          });
          return result.count === 1;
        },
        send: sendEmail,
      });
    } catch {
      redirect(getRedirect(
        locale,
        "kayit",
        "Doğrulama e-postası şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.",
      ));
    }

    redirect(getRedirect(
      locale,
      "giris",
      undefined,
      "Kayıt bilgileri alındı. Bu adres yeni bir hesaba uygunsa doğrulama e-postası gönderilecektir.",
    ));
  }

  if (!registrationTargetLimit.allowed) {
    redirect(getRedirect(
      locale,
      "giris",
      undefined,
      "Kayıt bilgileri alındı. Bu adres yeni bir hesaba uygunsa doğrulama e-postası gönderilecektir.",
    ));
  }

  const now = new Date();
  const registrationDefaults = getSelfServiceRegistrationDefaults(email);
  const { token, tokenHash, expiresAt } = createEmailVerificationToken();

  const user = await prisma.user.create({
    data: {
      name,
      nickname: registrationDefaults.nickname,
      displayNameMode: registrationDefaults.displayNameMode,
      email,
      passwordHash,
      isActive: false,
      emailVerifiedAt: null,
      emailVerificationTokenHash: tokenHash,
      emailVerificationExpiresAt: expiresAt,
      emailVerificationSentAt: now,
      role: registrationDefaults.role,
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
    const safeLocale = getSafeLocale(String(locale ?? "tr"));
    const verificationUrl = buildEmailVerificationUrl(token, safeLocale);
    const { subject, text, html } = buildWelcomeVerificationEmail({ name, verificationUrl, locale: safeLocale });

    await sendEmail({
      to: email,
      subject,
      text,
      html,
    });
  } catch {
    try {
      await prisma.user.delete({ where: { id: user.id } });
    } catch {
      console.error("[auth-registration-email]", {
        event: "new_registration_rollback_failed",
      });
    }
    redirect(getRedirect(
      locale,
      "kayit",
      "Doğrulama e-postası şu anda gönderilemiyor. Lütfen daha sonra tekrar deneyin.",
    ));
  }

  await recordSiteAnalyticsEvent({
    eventType: siteAnalyticsEvents.register,
    userId: user.id,
    locale: getSafeLocale(String(locale ?? "tr")),
    path: `/${getSafeLocale(String(locale ?? "tr"))}/kayit`,
    metadata: {
      electronicCommunicationConsent: electronicConsent,
    },
  });

  redirect(
    getRedirect(
      locale,
      "giris",
      undefined,
      "Kayıt bilgileri alındı. Bu adres yeni bir hesaba uygunsa doğrulama e-postası gönderilecektir.",
    ),
  );
}

export async function loginAction(formData: FormData) {
  const locale = formData.get("locale");
  const safeLocale = getSafeLocale(String(locale ?? "tr"));
  const returnTo = getSafeLocaleReturnPath(formData.get("returnTo"), safeLocale);
  const email = normalizeEmail(formData.get("email"));
  const password = String(formData.get("password") ?? "");
  const loginRedirect = (error?: string, message?: string) => getRedirect(locale, "giris", error, message, { returnTo });

  if (!email || !password) {
    redirect(loginRedirect("E-posta ve şifre zorunludur."));
  }

  const loginClientKey = getRateLimitClientKey(await headers());
  const loginLimit = await consumeDurableRateLimit({
    scope: "auth-login",
    identity: `${loginClientKey}:${email}`,
    maxAttempts: 8,
    windowMs: 15 * 60 * 1000,
    blockMs: 30 * 60 * 1000,
  });

  if (!loginLimit.allowed) {
    redirect(loginRedirect("Çok fazla giriş denemesi yapıldı. Lütfen daha sonra tekrar deneyin."));
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
      onboardingCompletedAt: true,
    },
  });

  if (!user) {
    await bcrypt.hash(password, 12);
    redirect(loginRedirect("E-posta veya şifre hatalı."));
  }

  if (!user.passwordHash) {
    await bcrypt.hash(password, 12);
    redirect(loginRedirect("E-posta veya şifre hatalı."));
  }

  if (!user.isActive) {
    redirect(
      loginRedirect(undefined, "Hesabın henüz aktif değil. E-posta kutundaki doğrulama bağlantısına tıklayarak hesabını aktif et."),
    );
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    redirect(loginRedirect("E-posta veya şifre hatalı."));
  }

  await createSession({
    id: user.id,
    name: user.name,
    nickname: user.nickname,
    displayNameMode: user.displayNameMode,
    email: user.email,
    role: user.role,
  });

  redirect(returnTo ?? getRedirect(locale, user.onboardingCompletedAt ? "panel" : "baslangic"));
}

export async function logoutAction(formData: FormData) {
  const locale = formData.get("locale");
  const sessionUser = await getSessionUser();

  if (sessionUser) {
    await revokeUserSessions(sessionUser.id);
  }

  await destroySession();
  redirect(getRedirect(locale, "giris"));
}

export async function updateElectronicCommunicationConsentAction(formData: FormData) {
  const locale = formData.get("locale");
  const sessionUser = await requireSession(
    locale,
    "panel",
    "Elektronik ileti tercihini değiştirmek için giriş yapmalısınız.",
  );
  const consent = formData.get("electronicCommunicationConsent") === "on";

  await updateElectronicCommunicationConsent({
    userId: sessionUser.id,
    consent,
  });
  const safeLocale = getSafeLocale(String(locale ?? "tr"));
  revalidatePath(`/${safeLocale}/panel`);
  redirect(getRedirect(
    locale,
    "panel",
    undefined,
    consent
      ? "Elektronik ileti izniniz kaydedildi."
      : "Elektronik ileti izniniz geri çekildi; yeni destek e-postası gönderilmeyecek.",
  ));
}

export async function submitVipPaymentClaimAction(formData: FormData) {
  const locale = formData.get("locale");
  const safeLocale = getSafeLocale(String(locale ?? "tr"));
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(getRedirect(locale, "giris", "Ödeme bildirimi için giriş yapmalısınız.", undefined, { returnTo: `/${safeLocale}/vip` }));
  }

  let claimResult: Awaited<ReturnType<typeof submitVipSubscriptionClaim>>;

  try {
    claimResult = await submitVipSubscriptionClaim({
      userId: sessionUser.id,
      providerReference: normalizeText(formData.get("providerReference")),
      userNote: normalizeText(formData.get("userNote")),
    });
  } catch (error) {
    redirect(getRedirect(locale, "vip", error instanceof Error ? error.message : "Ödeme bildirimi kaydedilemedi."));
  }

  revalidatePath(`/${safeLocale}/vip`);
  revalidatePath(`/${safeLocale}/admin`);
  redirect(getRedirect(
    locale,
    "vip",
    undefined,
    claimResult.reused
      ? "Bu ödeme bildirimi zaten kayıtlı ve doğrulama durumunu koruyor."
      : "Ödeme bildiriminiz alındı. Param dekontu doğrulandıktan sonra günlük AI sorgu hakkınız 15'e çıkacak.",
  ));
}

export async function reviewVipPaymentClaimAction(formData: FormData) {
  const locale = formData.get("locale");
  const admin = await requireAdminSession(locale);
  const decision = normalizeText(formData.get("decision"));

  if (decision !== "APPROVE" && decision !== "REJECT") {
    redirect(getRedirect(locale, "admin", "Geçerli bir VIP ödeme kararı seçilmedi."));
  }

  let reviewResult: Awaited<ReturnType<typeof reviewVipSubscriptionClaim>>;

  try {
    reviewResult = await reviewVipSubscriptionClaim({
      claimId: normalizeText(formData.get("claimId")),
      reviewerEmail: admin.email,
      decision,
      amountTry: normalizeOptionalNumber(formData.get("amountTry"), 0),
      currency: normalizeText(formData.get("currency")),
      payerEmail: normalizeText(formData.get("payerEmail")),
      adminNote: normalizeText(formData.get("adminNote")),
    });
  } catch (error) {
    redirect(getRedirect(locale, "admin", error instanceof Error ? error.message : "VIP ödeme bildirimi işlenemedi."));
  }

  if (!reviewResult.reused) {
    const approved = reviewResult.status === "APPROVED";
    await sendEmail({
      to: reviewResult.user.email,
      subject: approved ? "Enbilir VIP destek ödemeniz doğrulandı" : "Enbilir VIP ödeme bildiriminiz incelendi",
      text: approved
        ? "Param ödemeniz doğrulandı. Tanıtım dönemindeki tam VIP içerik erişiminiz ücretsiz devam eder; günlük AI sorgu hakkınız ödeme dönemi boyunca 10'dan 15'e çıktı."
        : "VIP ödeme bildiriminiz Param kayıtlarıyla doğrulanamadı. Lütfen dekont numaranızı kontrol edip yeniden bildirin.",
      html: approved
        ? "<p>Param ödemeniz doğrulandı. Tanıtım dönemindeki tam VIP içerik erişiminiz ücretsiz devam eder; <strong>günlük AI sorgu hakkınız ödeme dönemi boyunca 10'dan 15'e çıktı.</strong></p>"
        : "<p>VIP ödeme bildiriminiz Param kayıtlarıyla doğrulanamadı.</p><p>Lütfen dekont numaranızı kontrol edip yeniden bildirin.</p>",
    }).catch((error: unknown) => console.error("[vip-claim-email]", error instanceof Error ? error.message : error));
  }

  for (const currentLocale of ["tr", "en"] as const) {
    revalidatePath(`/${currentLocale}/admin`);
    revalidatePath(`/${currentLocale}/vip`);
    revalidatePath(`/${currentLocale}/vip/ajanlar`);
  }
  const reviewMessage = reviewResult.reused
    ? `Bu ödeme bildirimi daha önce ${reviewResult.status === "APPROVED" ? "onaylanmış" : "reddedilmiş"}. Yeni işlem ve e-posta oluşturulmadı.`
    : reviewResult.status === "APPROVED"
      ? "VIP ödeme doğrulandı ve günlük AI sorgu hakkı ödeme dönemi boyunca 15'e çıkarıldı."
      : "VIP ödeme bildirimi reddedildi.";
  redirect(getRedirect(locale, "admin", undefined, reviewMessage));
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
  const amountUsdText = String(formData.get("amountUsd") ?? 0);
  const amountUsd = Number(amountUsdText);
  const reason = normalizeText(formData.get("reason")).slice(0, 700) || null;
  const idempotencyKey = String(formData.get("idempotencyKey") ?? "");
  const cookieStore = await cookies();
  const nonceCookieName = getTradeIdempotencyCookieName(userId);
  let marketItem = await getLiveMarketItem(symbol);

  if (!/^[a-zA-Z0-9_-]{16,128}$/.test(idempotencyKey)) {
    return { ok: false, message: "İşlem güvenlik anahtarı geçersiz. Sayfayı yenileyip tekrar deneyin." };
  }

  if (cookieStore.get(nonceCookieName)?.value === idempotencyKey) {
    return { ok: true, message: "Bu işlem zaten uygulanmıştı; tekrar yazılmadı." };
  }

  if (submittedUserId && submittedUserId !== sessionUser.id) {
    return { ok: false, message: "Bu işlemi yalnızca kendi hesabın için yapabilirsin." };
  }

  if (!userId || !marketItem || !["BUY", "SELL"].includes(side) || !Number.isFinite(amountUsd) || amountUsd <= 0) {
    return { ok: false, message: "Lütfen ürün, işlem yönü ve pozitif USD tutarı seç." };
  }
  const amountUsdDecimal = decimal(amountUsdText);

  if (
    !isExecutableMarketQuote(marketItem)
  ) {
    return {
      ok: false,
      message: "Bu ürün için açık piyasa saatine ait güncel ve doğrulanmış fiyat yok. İşlem güvenlik amacıyla uygulanmadı.",
    };
  }
  let verifiedPriceAsOf = new Date(marketItem.sourceAsOf!);

  let existingPosition = await prisma.portfolioPosition.findUnique({
    where: { userId_symbol: { userId, symbol } },
  });
  let tradePriceUsd = side === "BUY"
    ? marketItem.askPriceUsd ?? marketItem.priceUsd
    : marketItem.bidPriceUsd ?? marketItem.priceUsd;

  if (!Number.isFinite(tradePriceUsd) || tradePriceUsd <= 0) {
    return { ok: false, message: "Seçilen ürün için geçerli fiyat bulunamadı." };
  }

  if (existingPosition) {
    const corporateActionSync = await syncPortfolioPositionCorporateAction(
      existingPosition,
      new Date(),
      { force: true },
    );

    if (!corporateActionSync.reliable) {
      return {
        ok: false,
        message: "Mevcut pozisyonun bölünme/kurumsal aksiyon bilgisi doğrulanamadı. Miktar ve maliyet güvenliği için işlem uygulanmadı.",
      };
    }

    if (corporateActionSync.updated) {
      existingPosition = await prisma.portfolioPosition.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });
    }
  }

  const account = await accrueRepoIfNeeded(userId);
  const cashRateToUsd = await getCashModeUsdRate(account.cashMode, undefined, account.cashMode !== "USD");

  if (cashRateToUsd === null) {
    return { ok: false, message: "Nakit para birimi için güncel döviz dönüşümü doğrulanamadı. İşlem uygulanmadı." };
  }

  const cashValueUsd = decimal(account.cashAmount).times(cashRateToUsd);

  if (side === "BUY" && amountUsdDecimal.greaterThan(cashValueUsd)) {
    return { ok: false, message: "Bu alım için yeterli sanal nakdin yok." };
  }

  let quantity = amountUsd / tradePriceUsd;

  if (!isExecutableMarketQuote(marketItem)) {
    const refreshedMarketItem = await getLiveMarketItem(symbol, { refresh: true });

    if (
      !refreshedMarketItem ||
      !isExecutableMarketQuote(refreshedMarketItem)
    ) {
      return {
        ok: false,
        message: "Bu ürün için açık piyasa saatine ait güncel ve doğrulanmış fiyat yok. İşlem güvenlik amacıyla uygulanmadı.",
      };
    }

    marketItem = refreshedMarketItem;
    verifiedPriceAsOf = new Date(marketItem.sourceAsOf!);
    tradePriceUsd = side === "BUY"
      ? marketItem.askPriceUsd ?? marketItem.priceUsd
      : marketItem.bidPriceUsd ?? marketItem.priceUsd;
    quantity = amountUsd / tradePriceUsd;

    if (!Number.isFinite(tradePriceUsd) || tradePriceUsd <= 0 || !Number.isFinite(quantity) || quantity <= 0) {
      return { ok: false, message: "Seçilen ürün için geçerli fiyat bulunamadı." };
    }

  }

  if (side === "SELL") {
    if (!existingPosition || decimal(existingPosition.quantity).lessThanOrEqualTo(0)) {
      return { ok: false, message: "Satış işlemi yapılamaz. Seçtiğiniz ürün portföyünüzde bulunmuyor." };
    }

    if (decimal(existingPosition.quantity).plus("0.000001").lessThan(quantity)) {
      return { ok: false, message: "Satmak istediğiniz miktar portföyünüzdeki miktardan fazla." };
    }
  }

  let transactionError: string | null = null;

  try {
    await withSerializableTransaction(async (tx) => {
      const latestAccount = await tx.virtualAccount.findUniqueOrThrow({ where: { userId } });
      const latestCashUsd = decimal(latestAccount.cashAmount).times(cashRateToUsd);

      if (side === "BUY" && amountUsdDecimal.greaterThan(latestCashUsd)) {
        throw new Error("Bu alım için yeterli sanal nakdin yok.");
      }

      const currentPosition = await tx.portfolioPosition.findUnique({
        where: { userId_symbol: { userId, symbol } },
      });
      const execution = getVirtualExecutionCostsDecimal({
        category: marketItem.category,
        side,
        quotePriceUsd: tradePriceUsd,
        requestedAmountUsd: amountUsdDecimal,
      });
      const currentTradePriceUsd = execution.executionPriceUsd;
      const currentQuantity = execution.quantity;
      const nextCashUsd = side === "BUY"
        ? latestCashUsd.minus(execution.cashDeltaUsd)
        : latestCashUsd.plus(execution.cashDeltaUsd);

      if (side === "SELL") {
        if (!currentPosition || decimal(currentPosition.quantity).lessThanOrEqualTo(0)) {
          throw new Error("Satış işlemi yapılamaz. Seçtiğiniz ürün portföyünüzde bulunmuyor.");
        }

        if (decimal(currentPosition.quantity).plus("0.000001").lessThan(currentQuantity)) {
          throw new Error("Satmak istediğiniz miktar portföyünüzdeki miktardan fazla.");
        }
      }

      await tx.virtualAccount.update({
        where: { userId },
        data: {
          cashAmount: nextCashUsd.div(cashRateToUsd),
        },
      });

      let positionCycleId = currentPosition?.positionCycleId ?? currentPosition?.id ?? randomUUID();
      let costBasisUsd: Prisma.Decimal | null = null;
      let realizedPnlUsd: Prisma.Decimal | null = null;
      let realizedPnlPercent: Prisma.Decimal | null = null;

      if (side === "BUY") {
        if (currentPosition) {
          const totalQuantity = decimal(currentPosition.quantity).plus(currentQuantity);
          const totalCost = decimal(currentPosition.quantity).times(currentPosition.averagePriceUsd).plus(execution.cashDeltaUsd);

          await tx.portfolioPosition.update({
            where: { userId_symbol: { userId, symbol } },
            data: {
              quantity: totalQuantity,
              averagePriceUsd: totalCost.div(totalQuantity),
              positionCycleId,
              providerSymbol: marketItem.providerSymbol ?? marketItem.dataSymbol,
            },
          });
        } else {
          positionCycleId = randomUUID();
          await tx.portfolioPosition.create({
            data: {
              userId,
              positionCycleId,
              symbol,
              providerSymbol: marketItem.providerSymbol ?? marketItem.dataSymbol,
              name: marketItem.name,
              market: marketItem.market,
              quantity: currentQuantity,
              averagePriceUsd: execution.cashDeltaUsd.div(currentQuantity),
            },
          });
        }
      } else if (currentPosition) {
        const nextQuantity = decimal(currentPosition.quantity).minus(currentQuantity);
        const realized = calculateRealizedTradePnlDecimal({
          quantity: currentQuantity,
          averagePriceUsd: currentPosition.averagePriceUsd,
          netProceedsUsd: execution.cashDeltaUsd,
        });
        costBasisUsd = realized.costBasisUsd;
        realizedPnlUsd = realized.realizedPnlUsd;
        realizedPnlPercent = realized.realizedPnlPercent;

        if (nextQuantity.lessThanOrEqualTo("0.000001")) {
          await tx.portfolioPosition.delete({ where: { userId_symbol: { userId, symbol } } });
        } else {
          await tx.portfolioPosition.update({
            where: { userId_symbol: { userId, symbol } },
            data: { quantity: nextQuantity },
          });
        }
      }

      const trade = await tx.virtualTrade.create({
        data: {
          userId,
          idempotencyKey,
          positionCycleId,
          symbol,
          name: marketItem.name,
          market: marketItem.market,
          side,
          quantity: currentQuantity.toString(),
          priceUsd: currentTradePriceUsd,
          totalUsd: execution.cashDeltaUsd,
          requestedAmountUsd: amountUsd,
          executionNotionalUsd: execution.executionNotionalUsd,
          feeUsd: execution.feeUsd,
          slippageUsd: execution.slippageUsd,
          costBasisUsd,
          realizedPnlUsd,
          realizedPnlPercent,
          quoteCurrency: marketItem.quoteCurrency ?? "USD",
          priceSource: marketItem.source,
          priceAsOf: verifiedPriceAsOf,
          reason,
        },
      });
      await appendAuditEvent(tx, {
        category: "PORTFOLIO",
        entityType: "VirtualTrade",
        entityId: trade.id,
        action: side,
        actorUserId: userId,
        payload: {
          symbol,
          quantity: currentQuantity,
          providerSymbol: marketItem.providerSymbol ?? marketItem.dataSymbol,
          valuationPriceType: marketItem.priceType ?? null,
          executionReferencePriceType: side === "BUY" ? "ASK" : "BID",
          priceUnit: marketItem.priceUnit ?? null,
          quotePriceUsd: decimal(tradePriceUsd).toString(),
          quoteCurrency: marketItem.quoteCurrency ?? "USD",
          sourceAsOf: marketItem.sourceAsOf,
          bidPriceUsd: marketItem.bidPriceUsd ?? null,
          askPriceUsd: marketItem.askPriceUsd ?? null,
          markPriceUsd: marketItem.markPriceUsd ?? null,
          indexPriceUsd: marketItem.indexPriceUsd ?? null,
          lastPriceUsd: marketItem.lastPriceUsd ?? null,
          bidPriceNative: marketItem.bidPriceNative ?? null,
          askPriceNative: marketItem.askPriceNative ?? null,
          markPriceNative: marketItem.markPriceNative ?? null,
          indexPriceNative: marketItem.indexPriceNative ?? null,
          lastPriceNative: marketItem.lastPriceNative ?? null,
          stablecoinRate: marketItem.stablecoinRate ?? null,
          stablecoinAsOf: marketItem.stablecoinAsOf ?? null,
          providerStatus: marketItem.providerStatus ?? null,
          providerDelisting: marketItem.providerDelisting ?? null,
          source: marketItem.source,
          retrievedAt: marketItem.retrievedAt ?? null,
          stablecoinProvider: marketItem.stablecoinProvider ?? null,
          instrumentType: marketItem.instrumentType ?? null,
          exchange: marketItem.exchange ?? null,
          settleCurrency: marketItem.settleCurrency ?? null,
          executionPriceUsd: currentTradePriceUsd.toString(),
          requestedAmountUsd: amountUsdDecimal.toString(),
          executionNotionalUsd: execution.executionNotionalUsd.toString(),
          feeUsd: execution.feeUsd.toString(),
          slippageUsd: execution.slippageUsd.toString(),
          realizedPnlUsd: realizedPnlUsd?.toString() ?? null,
        },
      });
    });
  } catch (error) {
    const duplicateTarget = error instanceof Prisma.PrismaClientKnownRequestError
      ? error.meta?.target
      : undefined;
    const isVirtualTradeIdempotencyConflict =
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      error.meta?.modelName === "VirtualTrade" &&
      Array.isArray(duplicateTarget) &&
      duplicateTarget.length === 2 &&
      duplicateTarget.includes("userId") &&
      duplicateTarget.includes("idempotencyKey");

    if (isVirtualTradeIdempotencyConflict) {
      return { ok: true, message: "Bu işlem zaten uygulanmıştı; tekrar yazılmadı." };
    }

    transactionError = error instanceof Error ? error.message : "İşlem uygulanamadı.";
  }

  if (transactionError) {
    return { ok: false, message: transactionError };
  }

  try {
    cookieStore.set(nonceCookieName, idempotencyKey, {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 10,
    });
  } catch {
    // The database idempotency key remains authoritative if nonce persistence fails.
  }

  try {
    await evaluateTradeBadges(userId);
  } catch {
    // Badge calculation is secondary; a completed trade must still return a success state.
  }

  try {
    const tradeCount = await prisma.virtualTrade.count({ where: { userId } });

    if (tradeCount === 1) {
      await recordSiteAnalyticsEvent({
        eventType: siteAnalyticsEvents.firstTrade,
        userId,
        locale: getSafeLocale(String(locale ?? "tr")),
        path: `/${getSafeLocale(String(locale ?? "tr"))}/islem-yap`,
        metadata: {
          symbol,
          side,
          amountUsd,
          market: marketItem.market,
        },
      });
    }
  } catch {
    // Analytics must never block a completed virtual trade.
  }

  try {
    await reconcileOnboardingCompletion(userId);
  } catch {
    // Onboarding reconciliation is secondary; the virtual trade is already committed.
  }

  try {
    revalidatePortfolioViews(locale);
  } catch {
    // Cache revalidation is secondary; the virtual trade is already committed.
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

  const account = await accrueRepoIfNeeded(userId);
  const [currentRateToUsd, nextRateToUsd] = await Promise.all([
    getCashModeUsdRate(account.cashMode, undefined, account.cashMode !== "USD"),
    getCashModeUsdRate(cashMode, undefined, cashMode !== "USD"),
  ]);

  if (currentRateToUsd === null || nextRateToUsd === null) {
    redirect(getRedirect(locale, "islem-yap", "Döviz dönüşümü için açık piyasaya ait doğrulanmış fiyat bulunamadı."));
  }

  const cashValueUsd = cashToUsd(account.cashAmount, account.cashMode, currentRateToUsd);

  await prisma.virtualAccount.update({
    where: { userId },
    data: {
      cashMode,
      cashAmount: usdToCash(cashValueUsd, cashMode, nextRateToUsd),
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
  const admin = await requireAdminSession(locale);
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

  await prisma.$transaction(async (tx) => {
    const placement = await tx.adPlacement.create({
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
    await appendAuditEvent(tx, {
      category: "ADMIN",
      entityType: "AdPlacement",
      entityId: placement.id,
      action: "CREATE",
      actorUserId: admin.id,
      payload: { slot, isActive },
    });
  });

  revalidateAdminManagedViews(locale);
  redirect(getRedirect(locale, "admin"));
}

export async function updateAdPlacementAction(formData: FormData) {
  const locale = formData.get("locale");
  const admin = await requireAdminSession(locale);
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

  await prisma.$transaction(async (tx) => {
    await tx.adPlacement.update({
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
    await appendAuditEvent(tx, {
      category: "ADMIN",
      entityType: "AdPlacement",
      entityId: id,
      action: "UPDATE",
      actorUserId: admin.id,
      payload: { slot, isActive },
    });
  });

  revalidateAdminManagedViews(locale);
  redirect(getRedirect(locale, "admin"));
}

export async function toggleAdPlacementAction(formData: FormData) {
  const locale = formData.get("locale");
  const admin = await requireAdminSession(locale);
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("nextActive") === "true";

  if (!id) {
    redirect(getRedirect(locale, "admin", "Reklam kaydı bulunamadı."));
  }

  await prisma.$transaction(async (tx) => {
    await tx.adPlacement.update({
      where: { id },
      data: { isActive: nextActive },
    });
    await appendAuditEvent(tx, {
      category: "ADMIN",
      entityType: "AdPlacement",
      entityId: id,
      action: nextActive ? "ACTIVATE" : "DEACTIVATE",
      actorUserId: admin.id,
    });
  });

  revalidateAdminManagedViews(locale);
  redirect(getRedirect(locale, "admin"));
}

export async function upsertManagedContentAction(formData: FormData) {
  const locale = formData.get("locale");
  const admin = await requireAdminSession(locale);
  const code = normalizeText(formData.get("code"));
  const title = normalizeText(formData.get("title"));
  const body = normalizeText(formData.get("body"));
  const isActive = formData.get("isActive") === "on";

  if (!code || !title || !body) {
    redirect(getRedirect(locale, "admin", "Sayfa kodu, başlık ve içerik zorunludur."));
  }

  await prisma.$transaction(async (tx) => {
    const page = await tx.managedContentPage.upsert({
      where: { code },
      create: { code, title, body, isActive },
      update: { title, body, isActive },
    });
    await appendAuditEvent(tx, {
      category: "ADMIN",
      entityType: "ManagedContentPage",
      entityId: page.id,
      action: "UPSERT",
      actorUserId: admin.id,
      payload: { code, isActive },
    });
  });

  revalidateAdminManagedViews(locale);
  redirect(getRedirect(locale, "admin"));
}

export async function upsertManagedContentItemAction(formData: FormData) {
  const locale = formData.get("locale");
  const admin = await requireAdminSession(locale);
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

  await prisma.$transaction(async (tx) => {
    const item = id
      ? await tx.managedContentItem.update({ where: { id }, data })
      : await tx.managedContentItem.create({ data });
    await appendAuditEvent(tx, {
      category: "ADMIN",
      entityType: "ManagedContentItem",
      entityId: item.id,
      action: id ? "UPDATE" : "CREATE",
      actorUserId: admin.id,
      payload: { type, locale: contentLocale, isActive, isFeatured },
    });
  });

  revalidateAdminManagedViews(locale, contentLocale);
  redirect(getRedirect(locale, "admin"));
}

export async function toggleManagedContentItemAction(formData: FormData) {
  const locale = formData.get("locale");
  const admin = await requireAdminSession(locale);
  const id = String(formData.get("id") ?? "");
  const nextActive = formData.get("nextActive") === "true";
  const contentLocale = formData.get("contentLocale");

  if (!id) {
    redirect(getRedirect(locale, "admin", "İçerik kaydı bulunamadı."));
  }

  await prisma.$transaction(async (tx) => {
    await tx.managedContentItem.update({
      where: { id },
      data: { isActive: nextActive },
    });
    await appendAuditEvent(tx, {
      category: "ADMIN",
      entityType: "ManagedContentItem",
      entityId: id,
      action: nextActive ? "ACTIVATE" : "DEACTIVATE",
      actorUserId: admin.id,
    });
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

  await prisma.$transaction(async (tx) => {
    await tx.badge.update({
      where: { id },
      data: { isActive: nextActive },
    });
    await appendAuditEvent(tx, {
      category: "ADMIN",
      entityType: "Badge",
      entityId: id,
      action: nextActive ? "ACTIVATE" : "DEACTIVATE",
      actorUserId: sessionUser.id,
    });
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

  await prisma.$transaction(async (tx) => {
    const period = await tx.competitionPeriod.create({
      data: {
        type,
        name,
        startsAt,
        endsAt,
        isActive,
      },
    });
    await appendAuditEvent(tx, {
      category: "COMPETITION",
      entityType: "CompetitionPeriod",
      entityId: period.id,
      action: "CREATE",
      actorUserId: sessionUser.id,
      payload: {
        type,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        isActive,
      },
    });
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

  await prisma.$transaction(async (tx) => {
    await tx.competitionPeriod.update({
      where: { id },
      data: { isActive: nextActive },
    });
    await appendAuditEvent(tx, {
      category: "COMPETITION",
      entityType: "CompetitionPeriod",
      entityId: id,
      action: nextActive ? "ACTIVATE" : "DEACTIVATE",
      actorUserId: sessionUser.id,
    });
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

    await appendAuditEvent(tx, {
      category: "LEAGUE",
      entityType: "League",
      entityId: league.id,
      action: "CREATE",
      actorUserId: sessionUser.id,
      payload: { name, slug, type },
    });

    return league;
  });

  await awardBadge(sessionUser.id, "FIRST_LEAGUE", { action: "create" });
  await reconcileOnboardingCompletion(sessionUser.id);

  redirect(getRedirect(locale, "panel"));
}

export async function joinLeagueAction(formData: FormData) {
  const locale = formData.get("locale");
  const safeLocale = getSafeLocale(String(locale ?? "tr"));
  const inviteCode = normalizeText(formData.get("inviteCode")).toUpperCase();
  const leagueId = normalizeText(formData.get("leagueId"));
  const leagueSlug = normalizeText(formData.get("leagueSlug"));
  const redirectTo = normalizeText(formData.get("redirectTo"));
  const safeRedirectTo = getSafeLocaleReturnPath(redirectTo, safeLocale);
  const sessionUser = await getSessionUser();

  if (!sessionUser) {
    redirect(getRedirect(locale, "giris", "Lige katılmak için giriş yapmalısın."));
  }

  if (!inviteCode && !leagueId && !leagueSlug) {
    redirect(getRedirect(locale, "ligler", "Katılmak istediğin ligi seçmelisin."));
  }

  const league = inviteCode
    ? await prisma.league.findUnique({
        where: { inviteCode },
        select: { id: true, slug: true, name: true, type: true, isActive: true },
      })
    : await prisma.league.findFirst({
        where: {
          isActive: true,
          OR: [
            leagueId ? { id: leagueId } : undefined,
            leagueSlug ? { slug: leagueSlug } : undefined,
          ].filter((condition): condition is { id: string } | { slug: string } => Boolean(condition)),
        },
        select: { id: true, slug: true, name: true, type: true, isActive: true },
      });

  if (
    inviteCode &&
    league &&
    !isLeagueInviteTargetMatch(league, { leagueId, leagueSlug })
  ) {
    redirect(getRedirect(
      locale,
      leagueSlug ? `ligler/${leagueSlug}` : "ligler",
      safeLocale === "tr" ? "Davet kodu bu lige ait değil." : "This invitation code does not belong to this league.",
    ));
  }

  if (!league || !league.isActive) {
    redirect(getRedirect(locale, "ligler", inviteCode ? "Davet kodu geçersiz veya lig aktif değil." : "Lig bulunamadı veya aktif değil."));
  }

  if (league.type === "PRIVATE" && !inviteCode) {
    redirect(getRedirect(
      locale,
      `ligler/${league.slug}`,
      safeLocale === "tr" ? "Özel lige katılmak için davet kodunu girmelisin." : "Enter the invitation code to join this private league.",
    ));
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
    revalidateSocialViews(locale);
    redirect(safeRedirectTo ?? getRedirect(locale, `ligler/${league.slug}`, "Bu lige zaten üyesin.").toString());
  }

  await prisma.$transaction(async (tx) => {
    const membership = await tx.leagueMembership.create({
      data: {
        leagueId: league.id,
        userId: sessionUser.id,
        role: "MEMBER",
      },
    });
    await appendAuditEvent(tx, {
      category: "LEAGUE",
      entityType: "LeagueMembership",
      entityId: membership.id,
      action: "JOIN",
      actorUserId: sessionUser.id,
      payload: {
        leagueId: league.id,
        source: inviteCode ? "invite-code" : "direct-join",
      },
    });
  });

  await recordSiteAnalyticsEvent({
    eventType: siteAnalyticsEvents.leagueJoin,
    userId: sessionUser.id,
    locale: getSafeLocale(String(locale ?? "tr")),
    path: `/${getSafeLocale(String(locale ?? "tr"))}/ligler/${league.slug}`,
    metadata: {
      leagueId: league.id,
      leagueSlug: league.slug,
      leagueName: league.name,
      leagueType: league.type,
      source: inviteCode ? "invite-code" : "direct-join",
    },
  });

  await awardBadge(sessionUser.id, "FIRST_LEAGUE", { action: "join", leagueId: league.id });
  await reconcileOnboardingCompletion(sessionUser.id);
  revalidateSocialViews(locale);

  redirect(safeRedirectTo ?? getRedirect(locale, `ligler/${league.slug}`).toString());
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

  try {
    await sendLatestMacroReportEmail({
      reportId: latestReport.id,
      recipient: {
        email: sessionUser.email,
        name: getDisplayName(sessionUser),
      },
    });

    await recordMacroReportEvent({
      reportId: latestReport.id,
      userId: sessionUser.id,
      eventType: macroReportEventTypes.emailSent,
      metadata: { source: "manual-latest-report-email" },
    });
  } catch (error) {
    await recordMacroReportEvent({
      reportId: latestReport.id,
      userId: sessionUser.id,
      eventType: macroReportEventTypes.emailFailed,
      metadata: { source: "manual-latest-report-email", message: error instanceof Error ? error.message : "unknown" },
    });

    redirect(getRedirect(locale, "ai-piyasa-asistani/raporlar", "Makro rapor e-postası gönderilemedi. SMTP ayarlarını kontrol edelim."));
  }

  redirect(getRedirect(locale, "ai-piyasa-asistani/raporlar", undefined, "En son makro rapor e-posta adresine gönderildi."));
}

export async function hideReportedChatMessageAction(formData: FormData) {
  const locale = formData.get("locale");
  const messageId = normalizeText(formData.get("messageId"));
  const sessionUser = await requireAdminSession(locale);

  if (!messageId) {
    redirect(getRedirect(locale, "admin", "Gizlenecek mesaj bulunamadı."));
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true },
  });

  if (!message) {
    redirect(getRedirect(locale, "admin", "Mesaj bulunamadı."));
  }

  await prisma.$transaction(async (tx) => {
    await tx.chatMessage.update({
      where: { id: messageId },
      data: {
        hiddenAt: new Date(),
        hiddenByUserId: sessionUser.id,
        hiddenReason: "Admin moderasyonu ile gizlendi.",
      },
    });
    const reports = await tx.chatMessageReport.updateMany({
      where: { messageId, status: "OPEN" },
      data: {
        status: "RESOLVED_HIDDEN",
        resolvedAt: new Date(),
      },
    });
    await appendAuditEvent(tx, {
      category: "MODERATION",
      entityType: "ChatMessage",
      entityId: messageId,
      action: "HIDE",
      actorUserId: sessionUser.id,
      payload: { resolvedReports: reports.count },
    });
  });

  revalidatePath(`/${getSafeLocale(String(locale ?? "tr"))}/admin`);
  redirect(getRedirect(locale, "admin", undefined, "Sohbet mesajı gizlendi."));
}
