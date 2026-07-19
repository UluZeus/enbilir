import nodemailer from "nodemailer";
import { randomUUID } from "node:crypto";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer;
    contentType: string;
    contentDisposition: "inline" | "attachment";
    cid?: string;
  }>;
};

function getSmtpConfig() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 587);
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const secure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true";

  if (!host || !from) {
    return null;
  }

  return {
    host,
    port: Number.isFinite(port) && port > 0 ? port : 587,
    secure,
    auth: user && password ? { user, pass: password } : undefined,
    from,
    envelopeFrom: process.env.SMTP_ENVELOPE_FROM ?? user ?? from,
    replyTo: process.env.SMTP_REPLY_TO ?? from,
    messageDomain: process.env.SMTP_MESSAGE_DOMAIN ?? getEmailDomain(from) ?? getEmailDomain(user ?? ""),
    unsubscribeEmail: process.env.SMTP_UNSUBSCRIBE_EMAIL ?? user,
  };
}

function getEmailDomain(value: string) {
  const match = value.match(/<([^>]+)>/)?.[1] ?? value;
  const email = match.trim();
  const atIndex = email.lastIndexOf("@");

  return atIndex > -1 ? email.slice(atIndex + 1).replace(/[^\w.-]/g, "") : null;
}

export async function sendEmail({ to, subject, text, html, attachments }: SendEmailInput) {
  const config = getSmtpConfig();

  if (!config) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP ayarları eksik. SMTP_HOST ve SMTP_FROM tanımlanmalı.");
    }

    console.info("[email:dev]", { to, subject, text, html });
    return { skipped: true as const };
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
  });

  await transport.sendMail({
    from: config.from,
    replyTo: config.replyTo,
    envelope: {
      from: config.envelopeFrom,
      to,
    },
    messageId: config.messageDomain ? `<${randomUUID()}@${config.messageDomain}>` : undefined,
    to,
    subject,
    text,
    html,
    attachments,
    headers: {
      "X-Mailer": "Enbilir Transactional Mailer",
      "X-Auto-Response-Suppress": "All",
      ...(config.unsubscribeEmail
        ? {
            "List-Unsubscribe": `<mailto:${config.unsubscribeEmail}?subject=unsubscribe>`,
          }
        : {}),
    },
  });

  return { skipped: false as const };
}
