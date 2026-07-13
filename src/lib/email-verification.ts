import crypto from "node:crypto";
import type { Locale } from "@/i18n/config";
import { getSiteUrl } from "@/lib/site-url";
import { buildUsageGuideEmailSection } from "@/lib/usage-guide-content";

const EMAIL_VERIFICATION_TTL_MS = 1000 * 60 * 60 * 24;

export function createEmailVerificationToken() {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_TTL_MS);

  return { token, tokenHash, expiresAt };
}

export function buildEmailVerificationUrl(token: string, locale?: string) {
  const url = new URL("/api/auth/verify-email", getSiteUrl());
  url.searchParams.set("token", token);

  if (locale) {
    url.searchParams.set("locale", locale);
  }

  return url.toString();
}

export function hashEmailVerificationToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function getEmailVerificationExpiryMessage(locale: Locale = "tr") {
  return locale === "en" ? "This link is valid for 24 hours." : "Bağlantı 24 saat boyunca geçerli.";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildWelcomeVerificationEmail({
  name,
  verificationUrl,
  locale = "tr",
}: {
  name: string;
  verificationUrl: string;
  locale?: Locale;
}) {
  const copy = locale === "en"
    ? {
        fallbackName: "Dear member",
        subject: "Welcome to Enbilir | Activate your account",
        greeting: "Hello",
        welcome: "Welcome to Enbilir.",
        intro: "We are delighted to have you in the Enbilir community, created to make financial literacy, virtual portfolio practice, and market tracking easier to understand.",
        verifyText: "Click the link below to activate your account and start using your virtual portfolio:",
        disclaimer: "This platform is designed for education, simulation, and financial awareness; it does not involve real-money transactions or investment advice.",
        signoff: "Welcome aboard,",
        emailTitle: "Welcome",
        emailSubtitle: "Your financial-literacy, virtual-portfolio, and market-learning journey has begun.",
        emailIntro: "We are delighted to welcome you to Enbilir. Here you can practice with a virtual portfolio, follow markets, and improve your decision discipline in an educational environment.",
        emailVerify: "Click the button below to activate your account and get started.",
        activate: "Activate My Account",
        fallbackLink: "If the button does not work, paste this link into your browser:",
        note: "Note: Enbilir is designed for education, simulation, and financial awareness; it does not involve real-money transactions or investment advice.",
      }
    : {
        fallbackName: "Değerli üyemiz",
        subject: "Enbilir'e hoş geldiniz | Hesabınızı aktifleştirin",
        greeting: "Merhaba",
        welcome: "Enbilir'e hoş geldiniz.",
        intro: "Finansal okuryazarlığı, sanal portföy deneyimini ve piyasa takibini daha anlaşılır hale getirmek için hazırladığımız Enbilir ailesine katıldığınız için çok mutlu olduk.",
        verifyText: "Hesabınızı aktif etmek ve sanal portföyünüzü kullanmaya başlamak için aşağıdaki bağlantıya tıklayın:",
        disclaimer: "Bu platform eğitim, simülasyon ve finansal farkındalık amacıyla hazırlanmıştır; gerçek para işlemi veya yatırım tavsiyesi içermez.",
        signoff: "Hoş geldiniz,",
        emailTitle: "Hoş geldiniz",
        emailSubtitle: "Finansal okuryazarlık, sanal portföy ve piyasa takibi yolculuğunuz başladı.",
        emailIntro: "Enbilir ailesine katıldığınız için çok mutlu olduk. Burada sanal portföyünüzle pratik yapabilir, piyasaları takip edebilir ve karar alma disiplininizi eğitim amaçlı bir ortamda geliştirebilirsiniz.",
        emailVerify: "Hesabınızı aktif etmek ve kullanmaya başlamak için aşağıdaki butona tıklayın.",
        activate: "Hesabımı Aktifleştir",
        fallbackLink: "Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırabilirsiniz:",
        note: "Not: Enbilir eğitim, simülasyon ve finansal farkındalık amacıyla hazırlanmıştır; gerçek para işlemi veya yatırım tavsiyesi içermez.",
      };
  const safeName = name.trim() || copy.fallbackName;
  const escapedName = escapeHtml(safeName);
  const escapedVerificationUrl = escapeHtml(verificationUrl);
  const expiryMessage = getEmailVerificationExpiryMessage(locale);
  const guide = buildUsageGuideEmailSection(locale);
  const subject = copy.subject;
  const text = [
    `${copy.greeting} ${safeName},`,
    "",
    copy.welcome,
    "",
    copy.intro,
    "",
    copy.verifyText,
    verificationUrl,
    "",
    expiryMessage,
    "",
    guide.text,
    "",
    copy.disclaimer,
    "",
    copy.signoff,
    "Dr. Hakan Ünsal",
  ].join("\n");
  const html = `
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#152033;">
      <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
        <div style="overflow:hidden;border-radius:20px;border:1px solid #dbe4ef;background:#ffffff;box-shadow:0 18px 45px rgba(15,23,42,0.10);">
          <div style="background:#101827;padding:28px;color:#ffffff;">
            <p style="margin:0 0 8px 0;color:#f5a623;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;">Enbilir</p>
            <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:900;">${escapeHtml(copy.emailTitle)}</h1>
            <p style="margin:14px 0 0 0;color:#d7dee9;font-size:15px;line-height:1.7;">${escapeHtml(copy.emailSubtitle)}</p>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;">${escapeHtml(copy.greeting)} <strong>${escapedName}</strong>,</p>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
              ${escapeHtml(copy.emailIntro)}
            </p>
            <p style="margin:0 0 22px 0;font-size:15px;line-height:1.7;color:#334155;">
              ${escapeHtml(copy.emailVerify)}
            </p>
            <p style="margin:0 0 22px 0;">
              <a href="${escapedVerificationUrl}" style="display:inline-block;border-radius:12px;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 22px;font-weight:900;font-size:15px;">
                ${escapeHtml(copy.activate)}
              </a>
            </p>
            <div style="margin:0 0 22px 0;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;padding:14px 16px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">${escapeHtml(copy.fallbackLink)}</p>
              <p style="margin:8px 0 0 0;font-size:12px;line-height:1.6;word-break:break-all;">
                <a href="${escapedVerificationUrl}" style="color:#0f766e;">${escapedVerificationUrl}</a>
              </p>
            </div>
            <p style="margin:0 0 18px 0;font-size:13px;line-height:1.6;color:#64748b;">${escapeHtml(expiryMessage)}</p>
            ${guide.html}
            <p style="margin:0 0 22px 0;font-size:13px;line-height:1.6;color:#64748b;">
              ${escapeHtml(copy.note)}
            </p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#152033;">
              ${escapeHtml(copy.signoff)}<br />
              <strong>Dr. Hakan Ünsal</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}
