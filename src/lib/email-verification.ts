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
