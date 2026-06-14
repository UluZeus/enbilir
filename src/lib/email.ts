import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
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
  };
}

export async function sendEmail({ to, subject, text, html }: SendEmailInput) {
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
    to,
    subject,
    text,
    html,
  });

  return { skipped: false as const };
}
