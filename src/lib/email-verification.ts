import crypto from "node:crypto";
import { getSiteUrl } from "@/lib/site-url";

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

export function getEmailVerificationExpiryMessage() {
  return "Bağlantı 24 saat boyunca geçerli.";
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
}: {
  name: string;
  verificationUrl: string;
}) {
  const safeName = name.trim() || "Değerli üyemiz";
  const escapedName = escapeHtml(safeName);
  const escapedVerificationUrl = escapeHtml(verificationUrl);
  const expiryMessage = getEmailVerificationExpiryMessage();
  const subject = "Enbilir'e hoş geldiniz | Hesabınızı aktifleştirin";
  const text = [
    `Merhaba ${safeName},`,
    "",
    "Enbilir'e hoş geldiniz.",
    "",
    "Finansal okuryazarlığı, sanal portföy deneyimini ve piyasa takibini daha anlaşılır hale getirmek için hazırladığımız Enbilir ailesine katıldığınız için çok mutlu olduk.",
    "",
    "Hesabınızı aktif etmek ve sanal portföyünüzü kullanmaya başlamak için aşağıdaki bağlantıya tıklayın:",
    verificationUrl,
    "",
    expiryMessage,
    "",
    "Bu platform eğitim, simülasyon ve finansal farkındalık amacıyla hazırlanmıştır; gerçek para işlemi veya yatırım tavsiyesi içermez.",
    "",
    "Hoş geldiniz,",
    "Dr. Hakan Ünsal",
  ].join("\n");
  const html = `
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#152033;">
      <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
        <div style="overflow:hidden;border-radius:20px;border:1px solid #dbe4ef;background:#ffffff;box-shadow:0 18px 45px rgba(15,23,42,0.10);">
          <div style="background:#101827;padding:28px;color:#ffffff;">
            <p style="margin:0 0 8px 0;color:#f5a623;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;">Enbilir</p>
            <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:900;">Hoş geldiniz</h1>
            <p style="margin:14px 0 0 0;color:#d7dee9;font-size:15px;line-height:1.7;">Finansal okuryazarlık, sanal portföy ve piyasa takibi yolculuğunuz başladı.</p>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;">Merhaba <strong>${escapedName}</strong>,</p>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
              Enbilir ailesine katıldığınız için çok mutlu olduk. Burada sanal portföyünüzle pratik yapabilir, piyasaları takip edebilir ve karar alma disiplininizi eğitim amaçlı bir ortamda geliştirebilirsiniz.
            </p>
            <p style="margin:0 0 22px 0;font-size:15px;line-height:1.7;color:#334155;">
              Hesabınızı aktif etmek ve kullanmaya başlamak için aşağıdaki butona tıklayın.
            </p>
            <p style="margin:0 0 22px 0;">
              <a href="${escapedVerificationUrl}" style="display:inline-block;border-radius:12px;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 22px;font-weight:900;font-size:15px;">
                Hesabımı Aktifleştir
              </a>
            </p>
            <div style="margin:0 0 22px 0;border-radius:14px;background:#f8fafc;border:1px solid #e2e8f0;padding:14px 16px;">
              <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırabilirsiniz:</p>
              <p style="margin:8px 0 0 0;font-size:12px;line-height:1.6;word-break:break-all;">
                <a href="${escapedVerificationUrl}" style="color:#0f766e;">${escapedVerificationUrl}</a>
              </p>
            </div>
            <p style="margin:0 0 18px 0;font-size:13px;line-height:1.6;color:#64748b;">${escapeHtml(expiryMessage)}</p>
            <p style="margin:0 0 22px 0;font-size:13px;line-height:1.6;color:#64748b;">
              Not: Enbilir eğitim, simülasyon ve finansal farkındalık amacıyla hazırlanmıştır; gerçek para işlemi veya yatırım tavsiyesi içermez.
            </p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#152033;">
              Hoş geldiniz,<br />
              <strong>Dr. Hakan Ünsal</strong>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}
