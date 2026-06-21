import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const PAYMENT_LINK = "https://isyerim.param.com.tr/#/paymentform/paymentrequest/boqGRDE32";
const TRIAL_DAYS = 30;
const TRIAL_REMINDER_DAYS_BEFORE_END = 7;
const TRIAL_REMINDER_AFTER_DAYS = TRIAL_DAYS - TRIAL_REMINDER_DAYS_BEFORE_END;
const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

const PAYMENT_EXPLANATION =
  "Bu 50 TL.'lik abonelik bedeli yapay zeka sorgulamaları için her sorgu başına yapay zeka şirketlerine yapılan ödemelerin bir bölümü karşılamak için sizden talep edilmektedir ve gönüllülük esasına bağlıdır. Ödemeyi yapmazsanız da aboneliğiniz finansal açıdan beni zor duruma düşürmediği sürece devam edecektir.";

const emailTypes = {
  trialEndingReminder: "TRIAL_ENDING_REMINDER",
  monthlyPaymentRequest: "MONTHLY_PAYMENT_REQUEST",
} as const;

type SubscriptionEmailType = (typeof emailTypes)[keyof typeof emailTypes];

type Recipient = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
};

type DueEmail = {
  type: SubscriptionEmailType;
  periodKey: string;
  recipient: Recipient;
  trialEndsAt?: Date;
};

type RunSubscriptionEmailJobInput = {
  now?: Date;
  dryRun?: boolean;
  limit?: number;
  testEmail?: string;
};

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getIstanbulMonthKey(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    timeZone: ISTANBUL_TIME_ZONE,
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? String(date.getUTCFullYear());
  const month = parts.find((part) => part.type === "month")?.value ?? String(date.getUTCMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function getDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatDateTr(date: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: ISTANBUL_TIME_ZONE,
  }).format(date);
}

function buildMailShell({ title, eyebrow, bodyHtml }: { title: string; eyebrow: string; bodyHtml: string }) {
  return `
    <div style="margin:0;padding:0;background:#f4f0eb;font-family:Arial,Helvetica,sans-serif;color:#152033;">
      <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
        <div style="overflow:hidden;border-radius:22px;border:1px solid #d1bfa7;background:#fffaf6;box-shadow:0 18px 45px rgba(73,73,75,0.12);">
          <div style="background:#49494b;padding:28px;color:#fffaf6;">
            <p style="margin:0 0 8px 0;color:#d1bfa7;font-size:12px;font-weight:900;letter-spacing:0.16em;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
            <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:900;">${escapeHtml(title)}</h1>
          </div>
          <div style="padding:28px;">
            ${bodyHtml}
            <p style="margin:24px 0 0 0;font-size:15px;line-height:1.7;color:#152033;">
              Saygılarımla,<br />
              <strong>Dr. Hakan Ünsal</strong><br />
              <a href="https://www.enbilir.com" style="color:#0f766e;text-decoration:none;">www.enbilir.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;
}

function buildPaymentButton() {
  return `
    <p style="margin:22px 0;">
      <a href="${PAYMENT_LINK}" style="display:inline-block;border-radius:14px;background:#bd8c7d;color:#ffffff;text-decoration:none;padding:14px 22px;font-weight:900;font-size:15px;">
        50 TL Abonelik Ödemesi Yap
      </a>
    </p>
    <p style="margin:0 0 18px 0;font-size:13px;line-height:1.7;color:#64748b;word-break:break-all;">
      Ödeme linki: <a href="${PAYMENT_LINK}" style="color:#0f766e;">${PAYMENT_LINK}</a>
    </p>
  `;
}

function buildTrialEndingReminderEmail(recipient: Recipient, trialEndsAt: Date) {
  const safeName = recipient.name.trim() || "Değerli üyemiz";
  const escapedName = escapeHtml(safeName);
  const trialEndLabel = formatDateTr(trialEndsAt);
  const subject = "Enbilir ücretsiz üyeliğiniz 1 hafta sonra sona eriyor";
  const text = [
    `Merhaba ${safeName},`,
    "",
    `Enbilir'deki 30 günlük ücretsiz kullanım süreniz yaklaşık bir hafta sonra, ${trialEndLabel} tarihinde sona erecek.`,
    "",
    "Dilerseniz kullanımınızı aylık 50 TL gönüllü abonelik katkısıyla sürdürebilirsiniz.",
    "",
    PAYMENT_EXPLANATION,
    "",
    `Ödeme linki: ${PAYMENT_LINK}`,
    "",
    "Saygılarımla,",
    "Dr. Hakan Ünsal",
    "www.enbilir.com",
  ].join("\n");
  const html = buildMailShell({
    eyebrow: "Enbilir Üyelik",
    title: "Ücretsiz döneminiz bitmeden kısa bir not",
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;">Merhaba <strong>${escapedName}</strong>,</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#334155;">
        Enbilir'deki 30 günlük ücretsiz kullanım süreniz yaklaşık bir hafta sonra, <strong>${escapeHtml(trialEndLabel)}</strong> tarihinde sona erecek.
      </p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#334155;">
        Dilerseniz kullanımınızı aylık <strong>50 TL</strong> gönüllü abonelik katkısıyla sürdürebilirsiniz.
      </p>
      <div style="margin:0 0 18px 0;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;padding:16px;">
        <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">${escapeHtml(PAYMENT_EXPLANATION)}</p>
      </div>
      ${buildPaymentButton()}
    `,
  });

  return { subject, text, html };
}

function buildMonthlyPaymentRequestEmail(recipient: Recipient) {
  const safeName = recipient.name.trim() || "Değerli üyemiz";
  const escapedName = escapeHtml(safeName);
  const subject = "Enbilir aylık gönüllü abonelik yenileme hatırlatması";
  const text = [
    `Merhaba ${safeName},`,
    "",
    "Enbilir kullanımınız için aylık 50 TL gönüllü abonelik yenileme hatırlatmasını paylaşıyoruz.",
    "",
    PAYMENT_EXPLANATION,
    "",
    `Ödeme linki: ${PAYMENT_LINK}`,
    "",
    "Saygılarımla,",
    "Dr. Hakan Ünsal",
    "www.enbilir.com",
  ].join("\n");
  const html = buildMailShell({
    eyebrow: "Enbilir Abonelik",
    title: "Aylık gönüllü abonelik hatırlatması",
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;">Merhaba <strong>${escapedName}</strong>,</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#334155;">
        Enbilir kullanımınız için aylık <strong>50 TL</strong> gönüllü abonelik yenileme hatırlatmasını paylaşıyoruz.
      </p>
      <div style="margin:0 0 18px 0;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;padding:16px;">
        <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">${escapeHtml(PAYMENT_EXPLANATION)}</p>
      </div>
      ${buildPaymentButton()}
    `,
  });

  return { subject, text, html };
}

function buildEmail(dueEmail: DueEmail) {
  if (dueEmail.type === emailTypes.trialEndingReminder) {
    return buildTrialEndingReminderEmail(dueEmail.recipient, dueEmail.trialEndsAt ?? addDays(dueEmail.recipient.createdAt, TRIAL_DAYS));
  }

  return buildMonthlyPaymentRequestEmail(dueEmail.recipient);
}

async function getDueEmails(now: Date, limit: number) {
  const monthlyPeriodKey = `monthly-${getIstanbulMonthKey(now)}`;
  const users = await prisma.user.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      subscriptionEmailLogs: {
        where: {
          OR: [
            { emailType: emailTypes.monthlyPaymentRequest, periodKey: monthlyPeriodKey },
            { emailType: emailTypes.trialEndingReminder },
          ],
        },
        select: { emailType: true, periodKey: true },
      },
    },
    orderBy: { createdAt: "asc" },
    take: limit,
  });
  const dueEmails: DueEmail[] = [];

  for (const user of users) {
    const recipient = {
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
    };
    const trialReminderAt = addDays(user.createdAt, TRIAL_REMINDER_AFTER_DAYS);
    const trialEndsAt = addDays(user.createdAt, TRIAL_DAYS);
    const trialPeriodKey = `trial-ending-${getDateKey(trialEndsAt)}`;
    const hasTrialReminder = user.subscriptionEmailLogs.some(
      (log) => log.emailType === emailTypes.trialEndingReminder && log.periodKey === trialPeriodKey,
    );
    const hasMonthlyPaymentRequest = user.subscriptionEmailLogs.some(
      (log) => log.emailType === emailTypes.monthlyPaymentRequest && log.periodKey === monthlyPeriodKey,
    );

    if (now >= trialReminderAt && now < trialEndsAt && !hasTrialReminder) {
      dueEmails.push({
        type: emailTypes.trialEndingReminder,
        periodKey: trialPeriodKey,
        recipient,
        trialEndsAt,
      });
    }

    if (now >= trialEndsAt && !hasMonthlyPaymentRequest) {
      dueEmails.push({
        type: emailTypes.monthlyPaymentRequest,
        periodKey: monthlyPeriodKey,
        recipient,
      });
    }
  }

  return dueEmails;
}

export async function runSubscriptionEmailJob({
  now = new Date(),
  dryRun = false,
  limit = 1000,
  testEmail,
}: RunSubscriptionEmailJobInput = {}) {
  if (testEmail) {
    const recipient = {
      id: "test-user",
      name: "Test Kullanıcısı",
      email: testEmail,
      createdAt: addDays(now, -TRIAL_REMINDER_AFTER_DAYS),
    };
    const testEmails: DueEmail[] = [
      {
        type: emailTypes.trialEndingReminder,
        periodKey: "test-trial-ending",
        recipient,
        trialEndsAt: addDays(recipient.createdAt, TRIAL_DAYS),
      },
      {
        type: emailTypes.monthlyPaymentRequest,
        periodKey: "test-monthly-payment",
        recipient,
      },
    ];

    if (!dryRun) {
      for (const dueEmail of testEmails) {
        const message = buildEmail(dueEmail);
        await sendEmail({ to: testEmail, subject: `[TEST] ${message.subject}`, text: message.text, html: message.html });
      }
    }

    return {
      dryRun,
      testMode: true,
      sent: dryRun ? 0 : testEmails.length,
      due: testEmails.length,
      failed: 0,
      results: testEmails.map((email) => ({
        emailType: email.type,
        periodKey: email.periodKey,
        recipientEmail: testEmail,
        status: dryRun ? "DRY_RUN" : "SENT",
      })),
    };
  }

  const dueEmails = await getDueEmails(now, limit);
  const results = [];
  let sent = 0;
  let failed = 0;

  for (const dueEmail of dueEmails) {
    const message = buildEmail(dueEmail);

    if (dryRun) {
      results.push({
        emailType: dueEmail.type,
        periodKey: dueEmail.periodKey,
        recipientEmail: dueEmail.recipient.email,
        status: "DRY_RUN",
      });
      continue;
    }

    try {
      await sendEmail({
        to: dueEmail.recipient.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      await prisma.subscriptionEmailLog.create({
        data: {
          userId: dueEmail.recipient.id,
          email: dueEmail.recipient.email,
          emailType: dueEmail.type,
          periodKey: dueEmail.periodKey,
          subject: message.subject,
          metadata: {
            paymentLink: PAYMENT_LINK,
            trialEndsAt: dueEmail.trialEndsAt?.toISOString(),
          },
        },
      });
      sent += 1;
      results.push({
        emailType: dueEmail.type,
        periodKey: dueEmail.periodKey,
        recipientEmail: dueEmail.recipient.email,
        status: "SENT",
      });
    } catch (error) {
      failed += 1;
      results.push({
        emailType: dueEmail.type,
        periodKey: dueEmail.periodKey,
        recipientEmail: dueEmail.recipient.email,
        status: "FAILED",
        error: error instanceof Error ? error.message : "Bilinmeyen mail hatasi",
      });
    }
  }

  return {
    dryRun,
    testMode: false,
    sent,
    due: dueEmails.length,
    failed,
    results,
  };
}

export const subscriptionEmailConfig = {
  paymentLink: PAYMENT_LINK,
  paymentExplanation: PAYMENT_EXPLANATION,
  emailTypes,
  trialDays: TRIAL_DAYS,
  trialReminderDaysBeforeEnd: TRIAL_REMINDER_DAYS_BEFORE_END,
};
