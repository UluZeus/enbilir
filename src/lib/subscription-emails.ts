import "server-only";

import { sendEmail } from "@/lib/email";
import { formatTryAmount, membershipConfig } from "@/lib/membership";
import {
  getIstanbulSupportMonth,
  SUPPORT_TIME_ZONE,
} from "@/lib/member-notices";
import { getParamVipPaymentUrl } from "@/lib/param-vip-payment";
import { prisma } from "@/lib/prisma";

const emailTypes = {
  vipSupportReminder: "VIP_SUPPORT_REMINDER",
} as const;

type Recipient = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  electronicCommunicationConsent: boolean;
  createdAt: Date;
  membershipTier: "STANDARD" | "VIP";
  vipPaidUntil: Date | null;
  vipSubscriptionClaims: Array<{ id: string }>;
};

type RunSubscriptionEmailJobInput = {
  now?: Date;
  dryRun?: boolean;
  limit?: number;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function isEligibleForSupportEmail(recipient: Recipient, now: Date) {
  const month = getIstanbulSupportMonth(now);
  const isPaidVipActive = Boolean(recipient.vipPaidUntil && recipient.vipPaidUntil > now);

  return recipient.isActive
    && recipient.electronicCommunicationConsent
    && recipient.createdAt < month.startsAt
    && month.dayOfMonth >= 5
    && !isPaidVipActive
    && recipient.vipSubscriptionClaims.length === 0;
}

function buildSupportEmail(recipient: Pick<Recipient, "name">, paymentUrl: string | null) {
  const safeName = recipient.name.trim() || "Değerli üyemiz";
  const amount = formatTryAmount(membershipConfig.vipMonthlyAmountTry);
  const explanation = `Enbilir'in tanıtım döneminde tüm VIP içerik erişimi ücretsizdir. Ücretsiz planda günlük ${membershipConfig.freeDailyAiQueryLimit}, doğrulanmış aylık ${amount} VIP desteğinde günlük ${membershipConfig.paidVipDailyAiQueryLimit} AI sorgusu sunulur. Destek isteğe bağlıdır, otomatik yenilenmez ve Param dekontu hesapla eşleştirilip yetkili olarak doğrulanmadan hakkı değiştirmez.`;
  const subject = "Enbilir'in AI işletim maliyetlerine isteğe bağlı destek";
  const paymentText = paymentUrl
    ? `\n\nParam ödeme bağlantısı: ${paymentUrl}`
    : "";
  const text = [
    `Merhaba ${safeName},`,
    "",
    explanation,
    paymentText,
    "",
    "Bu, bu ay alacağınız tek destek hatırlatma e-postasıdır.",
    "",
    "Elektronik ileti izninizi hesap ayarlarınızdan dilediğiniz zaman geri çekebilirsiniz.",
    "",
    "Saygılarımla,",
    "Dr. Hakan Ünsal",
    "www.enbilir.com",
  ].join("\n");
  const paymentButton = paymentUrl
    ? `
      <p style="margin:22px 0;">
        <a href="${escapeHtml(paymentUrl)}" style="display:inline-block;border-radius:14px;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 22px;font-weight:900;font-size:15px;">
          İsteğe bağlı ${escapeHtml(amount)} VIP desteği
        </a>
      </p>
    `
    : "";
  const html = `
    <div style="margin:0;padding:0;background:#f4f0eb;font-family:Arial,Helvetica,sans-serif;color:#152033;">
      <div style="max-width:680px;margin:0 auto;padding:28px 16px;">
        <div style="overflow:hidden;border-radius:22px;border:1px solid #d1bfa7;background:#fffaf6;">
          <div style="background:#49494b;padding:28px;color:#fffaf6;">
            <p style="margin:0 0 8px;color:#d1bfa7;font-size:12px;font-weight:900;letter-spacing:.16em;text-transform:uppercase;">Enbilir VIP desteği</p>
            <h1 style="margin:0;font-size:28px;line-height:1.2;">Tam içerik erişimi ücretsiz devam ediyor</h1>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px;font-size:16px;line-height:1.7;">Merhaba <strong>${escapeHtml(safeName)}</strong>,</p>
            <p style="margin:0 0 16px;font-size:15px;line-height:1.8;color:#334155;">${escapeHtml(explanation)}</p>
            ${paymentButton}
            <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#64748b;">Bu, bu ay alacağınız tek destek hatırlatma e-postasıdır.</p>
            <p style="margin:16px 0 0;font-size:13px;line-height:1.7;color:#64748b;">Elektronik ileti izninizi hesap ayarlarınızdan dilediğiniz zaman geri çekebilirsiniz.</p>
            <p style="margin:24px 0 0;font-size:15px;line-height:1.7;">Saygılarımla,<br /><strong>Dr. Hakan Ünsal</strong><br /><a href="https://www.enbilir.com" style="color:#0f766e;text-decoration:none;">www.enbilir.com</a></p>
          </div>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}

const recipientSelect = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  electronicCommunicationConsent: true,
  createdAt: true,
  membershipTier: true,
  vipPaidUntil: true,
  vipSubscriptionClaims: {
    where: { status: "PENDING" },
    select: { id: true },
    take: 1,
  },
} as const;

async function getDueRecipients(now: Date, limit: number) {
  const { periodKey, startsAt } = getIstanbulSupportMonth(now);
  const candidates = await prisma.user.findMany({
    where: {
      isActive: true,
      electronicCommunicationConsent: true,
      createdAt: { lt: startsAt },
      OR: [
        { vipPaidUntil: null },
        { vipPaidUntil: { lte: now } },
      ],
      vipSubscriptionClaims: {
        none: { status: "PENDING" },
      },
      supportReminderPeriods: {
        none: {
          periodKey,
          emailAttemptedAt: { not: null },
        },
      },
    },
    select: recipientSelect,
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  return candidates.filter((recipient) => isEligibleForSupportEmail(recipient, now));
}

async function claimEmailAttempt(userId: string, now: Date) {
  const { periodKey } = getIstanbulSupportMonth(now);

  return prisma.$transaction(async (transaction) => {
    const recipient = await transaction.user.findUnique({
      where: { id: userId },
      select: recipientSelect,
    });
    if (!recipient || !isEligibleForSupportEmail(recipient, now)) {
      return null;
    }

    const period = await transaction.supportReminderPeriod.upsert({
      where: {
        userId_periodKey: {
          userId,
          periodKey,
        },
      },
      create: {
        userId,
        periodKey,
      },
      update: {},
      select: { id: true },
    });
    const claimed = await transaction.supportReminderPeriod.updateMany({
      where: {
        id: period.id,
        emailAttemptedAt: null,
      },
      data: {
        emailAttemptedAt: now,
        emailStatus: "CLAIMED",
        emailError: null,
      },
    });

    return claimed.count === 1 ? { periodId: period.id, recipient } : null;
  });
}

async function recheckRecipient(userId: string, now: Date) {
  const recipient = await prisma.user.findUnique({
    where: { id: userId },
    select: recipientSelect,
  });
  return recipient && isEligibleForSupportEmail(recipient, now) ? recipient : null;
}

export async function runSubscriptionEmailJob({
  now = new Date(),
  dryRun = false,
  limit = 1000,
}: RunSubscriptionEmailJobInput = {}) {
  const paymentUrl = getParamVipPaymentUrl();

  const recipients = await getDueRecipients(now, limit);
  if (dryRun) {
    return {
      dryRun: true,
      testMode: false,
      sent: 0,
      due: recipients.length,
      failed: 0,
      results: recipients.map((recipient) => ({
        emailType: emailTypes.vipSupportReminder,
        periodKey: getIstanbulSupportMonth(now).periodKey,
        userId: recipient.id,
        status: "DRY_RUN",
      })),
    };
  }

  const results = [];
  let sent = 0;
  let failed = 0;

  for (const candidate of recipients) {
    const claim = await claimEmailAttempt(candidate.id, now);
    if (!claim) {
      results.push({
        emailType: emailTypes.vipSupportReminder,
        periodKey: getIstanbulSupportMonth(now).periodKey,
        userId: candidate.id,
        status: "ALREADY_ATTEMPTED",
      });
      continue;
    }

    const recipient = await recheckRecipient(candidate.id, now);
    if (!recipient) {
      await prisma.supportReminderPeriod.update({
        where: { id: claim.periodId },
        data: {
          emailStatus: "CANCELLED",
          emailError: "CONSENT_OR_ELIGIBILITY_CHANGED",
        },
      });
      results.push({
        emailType: emailTypes.vipSupportReminder,
        periodKey: getIstanbulSupportMonth(now).periodKey,
        userId: candidate.id,
        status: "CANCELLED",
      });
      continue;
    }

    const message = buildSupportEmail(recipient, paymentUrl);
    try {
      await sendEmail({
        to: recipient.email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      await prisma.supportReminderPeriod.update({
        where: { id: claim.periodId },
        data: {
          emailStatus: "SENT",
          emailSentAt: now,
          emailError: null,
        },
      });
      sent += 1;
      results.push({
        emailType: emailTypes.vipSupportReminder,
        periodKey: getIstanbulSupportMonth(now).periodKey,
        userId: candidate.id,
        status: "SENT",
      });
    } catch {
      await prisma.supportReminderPeriod.update({
        where: { id: claim.periodId },
        data: {
          emailStatus: "FAILED",
          emailError: "DELIVERY_FAILED",
        },
      });
      failed += 1;
      results.push({
        emailType: emailTypes.vipSupportReminder,
        periodKey: getIstanbulSupportMonth(now).periodKey,
        userId: candidate.id,
        status: "FAILED",
      });
    }
  }

  return {
    dryRun: false,
    testMode: false,
    sent,
    due: recipients.length,
    failed,
    results,
  };
}

export const subscriptionEmailConfig = {
  emailTypes,
  amountTry: membershipConfig.vipMonthlyAmountTry,
  freeDailyAiQueryLimit: membershipConfig.freeDailyAiQueryLimit,
  paidVipDailyAiQueryLimit: membershipConfig.paidVipDailyAiQueryLimit,
  timeZone: SUPPORT_TIME_ZONE,
};
