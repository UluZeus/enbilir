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

const EMAIL_NOT_CONFIGURED_MESSAGE = "E-posta teslimatı yapılandırılmamış.";
const EMAIL_DELIVERY_FAILED_MESSAGE = "E-posta teslimatı tamamlanamadı.";
const SMTP_CONNECTION_TIMEOUT_MS = 10_000;
const SMTP_GREETING_TIMEOUT_MS = 10_000;
const SMTP_SOCKET_TIMEOUT_MS = 20_000;

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

function normalizeMailbox(value: unknown) {
  const address = typeof value === "string"
    ? value
    : value && typeof value === "object" && "address" in value
      ? String(value.address)
      : "";
  const match = address.match(/<([^>]+)>/)?.[1] ?? address;
  return match.trim().toLowerCase();
}

export function assertEmailDeliveryConfigured() {
  if (!getSmtpConfig()) {
    throw new Error(EMAIL_NOT_CONFIGURED_MESSAGE);
  }
}

export async function sendEmail({ to, subject, text, html, attachments }: SendEmailInput) {
  const config = getSmtpConfig();

  if (!config) {
    throw new Error(EMAIL_NOT_CONFIGURED_MESSAGE);
  }

  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: SMTP_CONNECTION_TIMEOUT_MS,
    greetingTimeout: SMTP_GREETING_TIMEOUT_MS,
    socketTimeout: SMTP_SOCKET_TIMEOUT_MS,
  });

  try {
    const result = await transport.sendMail({
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

    const target = normalizeMailbox(to);
    const accepted = Array.isArray(result.accepted)
      ? result.accepted.some((recipient: unknown) => normalizeMailbox(recipient) === target)
      : false;

    if (!accepted) {
      throw new Error(EMAIL_DELIVERY_FAILED_MESSAGE);
    }
  } catch (error) {
    throw new Error(EMAIL_DELIVERY_FAILED_MESSAGE, { cause: error });
  }

  return { skipped: false as const };
}
