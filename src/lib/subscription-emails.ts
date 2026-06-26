import { sendEmail } from "@/lib/email";
import { addMembershipDays, formatTryAmount, membershipConfig } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

const STANDARD_PAYMENT_LINK = membershipConfig.standardPaymentLink;
const VIP_PAYMENT_LINK = membershipConfig.vipPaymentLink;
const TRIAL_DAYS = membershipConfig.trialDays;
const TRIAL_REMINDER_DAYS_BEFORE_END = membershipConfig.trialReminderDaysBeforeEnd;
const TRIAL_REMINDER_AFTER_DAYS = TRIAL_DAYS - TRIAL_REMINDER_DAYS_BEFORE_END;
const ISTANBUL_TIME_ZONE = "Europe/Istanbul";

const PAYMENT_EXPLANATION =
  `Standart üyelikte ${formatTryAmount(membershipConfig.standardMonthlyAmountTry)} aylık katkı gönüllülük esasına bağlıdır. Bu katkı, sitedeki canlı/cache piyasa verisi ve standart AI sohbet altyapısının maliyetini karşılamaya destek olur; ödeme yapılmasa da standart kullanımınız, site sürdürülebilirliği izin verdiği sürece devam eder.`;

const VIP_PAYMENT_EXPLANATION =
  `VIP üyelik aylık ${formatTryAmount(membershipConfig.vipMonthlyAmountTry)} olarak kurgulanmıştır. VIP üyelikte AI Asistan, sitedeki canlı/cache veriye ek olarak ücretsiz erişilebilen public haber/veri kaynaklarından derlenen bağlamla daha üst seviye piyasa okuması sunar. VIP ödeme yenilenmezse üyelik standart seviyeye döner.`;

const emailTypes = {
  trialEndingReminder: "TRIAL_ENDING_REMINDER",
  monthlyPaymentRequest: "MONTHLY_PAYMENT_REQUEST",
  vipPaymentReminder: "VIP_PAYMENT_REMINDER",
  vipDowngradeNotice: "VIP_DOWNGRADE_NOTICE",
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
  vipPaidUntil?: Date;
};

type RunSubscriptionEmailJobInput = {
  now?: Date;
  dryRun?: boolean;
  limit?: number;
  testEmail?: string;
};

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
      <a href="${STANDARD_PAYMENT_LINK}" style="display:inline-block;border-radius:14px;background:#bd8c7d;color:#ffffff;text-decoration:none;padding:14px 22px;font-weight:900;font-size:15px;">
        ${formatTryAmount(membershipConfig.standardMonthlyAmountTry)} Standart Katkı Ödemesi Yap
      </a>
    </p>
    <p style="margin:0 0 18px 0;font-size:13px;line-height:1.7;color:#64748b;word-break:break-all;">
      Ödeme linki: <a href="${STANDARD_PAYMENT_LINK}" style="color:#0f766e;">${STANDARD_PAYMENT_LINK}</a>
    </p>
  `;
}

function buildVipPaymentButton() {
  return `
    <p style="margin:22px 0;">
      <a href="${VIP_PAYMENT_LINK}" style="display:inline-block;border-radius:14px;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 22px;font-weight:900;font-size:15px;">
        ${formatTryAmount(membershipConfig.vipMonthlyAmountTry)} VIP Üyelik Ödemesi Yap
      </a>
    </p>
    <p style="margin:0 0 18px 0;font-size:13px;line-height:1.7;color:#64748b;word-break:break-all;">
      VIP ödeme linki: <a href="${VIP_PAYMENT_LINK}" style="color:#0f766e;">${VIP_PAYMENT_LINK}</a>
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
    `Dilerseniz kullanımınızı aylık ${formatTryAmount(membershipConfig.standardMonthlyAmountTry)} gönüllü abonelik katkısıyla sürdürebilirsiniz.`,
    "",
    `VIP üyelik isterseniz aylık ${formatTryAmount(membershipConfig.vipMonthlyAmountTry)} ile daha üst seviye AI Asistan hizmetine geçebilirsiniz.`,
    "",
    PAYMENT_EXPLANATION,
    "",
    VIP_PAYMENT_EXPLANATION,
    "",
    `Standart ödeme linki: ${STANDARD_PAYMENT_LINK}`,
    `VIP ödeme linki: ${VIP_PAYMENT_LINK}`,
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
        Dilerseniz kullanımınızı aylık <strong>${formatTryAmount(membershipConfig.standardMonthlyAmountTry)}</strong> gönüllü abonelik katkısıyla sürdürebilirsiniz.
      </p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#334155;">
        Daha üst seviye AI Asistan isterseniz VIP üyelik aylık <strong>${formatTryAmount(membershipConfig.vipMonthlyAmountTry)}</strong> olarak devam eder.
      </p>
      <div style="margin:0 0 18px 0;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;padding:16px;">
        <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">${escapeHtml(PAYMENT_EXPLANATION)}</p>
      </div>
      ${buildPaymentButton()}
      <div style="margin:18px 0;border-radius:16px;background:#ecfdf5;border:1px solid #bbf7d0;padding:16px;">
        <p style="margin:0;font-size:14px;line-height:1.8;color:#14532d;">${escapeHtml(VIP_PAYMENT_EXPLANATION)}</p>
      </div>
      ${buildVipPaymentButton()}
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
    `Enbilir standart kullanımınız için aylık ${formatTryAmount(membershipConfig.standardMonthlyAmountTry)} gönüllü abonelik yenileme hatırlatmasını paylaşıyoruz.`,
    "",
    PAYMENT_EXPLANATION,
    "",
    `Ödeme linki: ${STANDARD_PAYMENT_LINK}`,
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
        Enbilir standart kullanımınız için aylık <strong>${formatTryAmount(membershipConfig.standardMonthlyAmountTry)}</strong> gönüllü abonelik yenileme hatırlatmasını paylaşıyoruz.
      </p>
      <div style="margin:0 0 18px 0;border-radius:16px;background:#f8fafc;border:1px solid #e2e8f0;padding:16px;">
        <p style="margin:0;font-size:14px;line-height:1.8;color:#334155;">${escapeHtml(PAYMENT_EXPLANATION)}</p>
      </div>
      ${buildPaymentButton()}
    `,
  });

  return { subject, text, html };
}

function buildVipPaymentReminderEmail(recipient: Recipient, vipPaidUntil: Date) {
  const safeName = recipient.name.trim() || "Değerli üyemiz";
  const escapedName = escapeHtml(safeName);
  const vipEndLabel = formatDateTr(vipPaidUntil);
  const subject = "Enbilir VIP üyeliğinizin yenileme zamanı yaklaşıyor";
  const text = [
    `Merhaba ${safeName},`,
    "",
    `VIP üyeliğiniz ${vipEndLabel} tarihinde yenileme dönemine giriyor.`,
    "",
    VIP_PAYMENT_EXPLANATION,
    "",
    `VIP ödeme linki: ${VIP_PAYMENT_LINK}`,
    "",
    "Ödeme yenilenmezse VIP üyeliğiniz standart üyeliğe dönüşür; standart kullanımınız devam eder.",
    "",
    "Saygılarımla,",
    "Dr. Hakan Ünsal",
    "www.enbilir.com",
  ].join("\n");
  const html = buildMailShell({
    eyebrow: "Enbilir VIP",
    title: "VIP üyelik yenileme hatırlatması",
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;">Merhaba <strong>${escapedName}</strong>,</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#334155;">
        VIP üyeliğiniz <strong>${escapeHtml(vipEndLabel)}</strong> tarihinde yenileme dönemine giriyor.
      </p>
      <div style="margin:0 0 18px 0;border-radius:16px;background:#ecfdf5;border:1px solid #bbf7d0;padding:16px;">
        <p style="margin:0;font-size:14px;line-height:1.8;color:#14532d;">${escapeHtml(VIP_PAYMENT_EXPLANATION)}</p>
      </div>
      ${buildVipPaymentButton()}
      <p style="margin:0 0 16px 0;font-size:14px;line-height:1.8;color:#64748b;">
        Ödeme yenilenmezse VIP üyeliğiniz standart üyeliğe dönüşür; standart kullanımınız devam eder.
      </p>
    `,
  });

  return { subject, text, html };
}

function buildVipDowngradeNoticeEmail(recipient: Recipient, vipPaidUntil: Date) {
  const safeName = recipient.name.trim() || "Değerli üyemiz";
  const escapedName = escapeHtml(safeName);
  const vipEndLabel = formatDateTr(vipPaidUntil);
  const subject = "Enbilir VIP üyeliğiniz standart üyeliğe döndü";
  const text = [
    `Merhaba ${safeName},`,
    "",
    `VIP ödeme döneminiz ${vipEndLabel} tarihinde sona erdiği için üyeliğiniz standart üyeliğe dönüştürüldü.`,
    "",
    "VIP hizmete devam etmek isterseniz ödeme linkinden yenileme yapabilirsiniz.",
    "",
    `VIP ödeme linki: ${VIP_PAYMENT_LINK}`,
    "",
    "Saygılarımla,",
    "Dr. Hakan Ünsal",
    "www.enbilir.com",
  ].join("\n");
  const html = buildMailShell({
    eyebrow: "Enbilir VIP",
    title: "VIP üyelik durumu",
    bodyHtml: `
      <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;">Merhaba <strong>${escapedName}</strong>,</p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#334155;">
        VIP ödeme döneminiz <strong>${escapeHtml(vipEndLabel)}</strong> tarihinde sona erdiği için üyeliğiniz standart üyeliğe dönüştürüldü.
      </p>
      <p style="margin:0 0 16px 0;font-size:15px;line-height:1.8;color:#334155;">
        VIP hizmete devam etmek isterseniz ödeme linkinden yenileme yapabilirsiniz.
      </p>
      ${buildVipPaymentButton()}
    `,
  });

  return { subject, text, html };
}

function buildEmail(dueEmail: DueEmail) {
  if (dueEmail.type === emailTypes.trialEndingReminder) {
    return buildTrialEndingReminderEmail(dueEmail.recipient, dueEmail.trialEndsAt ?? addMembershipDays(dueEmail.recipient.createdAt, TRIAL_DAYS));
  }

  if (dueEmail.type === emailTypes.vipPaymentReminder) {
    return buildVipPaymentReminderEmail(dueEmail.recipient, dueEmail.vipPaidUntil ?? new Date());
  }

  if (dueEmail.type === emailTypes.vipDowngradeNotice) {
    return buildVipDowngradeNoticeEmail(dueEmail.recipient, dueEmail.vipPaidUntil ?? new Date());
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
      membershipTier: true,
      vipPaidUntil: true,
      subscriptionEmailLogs: {
        where: {
          OR: [
            { emailType: emailTypes.monthlyPaymentRequest, periodKey: monthlyPeriodKey },
            { emailType: emailTypes.trialEndingReminder },
            { emailType: emailTypes.vipPaymentReminder },
            { emailType: emailTypes.vipDowngradeNotice },
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
    const trialReminderAt = addMembershipDays(user.createdAt, TRIAL_REMINDER_AFTER_DAYS);
    const trialEndsAt = addMembershipDays(user.createdAt, TRIAL_DAYS);
    const trialPeriodKey = `trial-ending-${getDateKey(trialEndsAt)}`;
    const vipPaidUntil = user.vipPaidUntil;
    const vipReminderAt = vipPaidUntil ? addMembershipDays(vipPaidUntil, -7) : null;
    const vipPeriodKey = vipPaidUntil ? `vip-renewal-${getDateKey(vipPaidUntil)}` : null;
    const vipDowngradePeriodKey = vipPaidUntil ? `vip-downgrade-${getDateKey(vipPaidUntil)}` : null;
    const hasTrialReminder = user.subscriptionEmailLogs.some(
      (log) => log.emailType === emailTypes.trialEndingReminder && log.periodKey === trialPeriodKey,
    );
    const hasMonthlyPaymentRequest = user.subscriptionEmailLogs.some(
      (log) => log.emailType === emailTypes.monthlyPaymentRequest && log.periodKey === monthlyPeriodKey,
    );
    const hasVipPaymentReminder = vipPeriodKey
      ? user.subscriptionEmailLogs.some((log) => log.emailType === emailTypes.vipPaymentReminder && log.periodKey === vipPeriodKey)
      : true;
    const hasVipDowngradeNotice = vipDowngradePeriodKey
      ? user.subscriptionEmailLogs.some((log) => log.emailType === emailTypes.vipDowngradeNotice && log.periodKey === vipDowngradePeriodKey)
      : true;

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

    if (user.membershipTier === "VIP" && vipPaidUntil && vipReminderAt && now >= vipReminderAt && now < vipPaidUntil && !hasVipPaymentReminder) {
      dueEmails.push({
        type: emailTypes.vipPaymentReminder,
        periodKey: vipPeriodKey ?? monthlyPeriodKey,
        recipient,
        vipPaidUntil,
      });
    }

    if (user.membershipTier === "VIP" && vipPaidUntil && now >= vipPaidUntil && !hasVipDowngradeNotice) {
      dueEmails.push({
        type: emailTypes.vipDowngradeNotice,
        periodKey: vipDowngradePeriodKey ?? monthlyPeriodKey,
        recipient,
        vipPaidUntil,
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
      createdAt: addMembershipDays(now, -TRIAL_REMINDER_AFTER_DAYS),
    };
    const testEmails: DueEmail[] = [
      {
        type: emailTypes.trialEndingReminder,
        periodKey: "test-trial-ending",
        recipient,
        trialEndsAt: addMembershipDays(recipient.createdAt, TRIAL_DAYS),
      },
      {
        type: emailTypes.monthlyPaymentRequest,
        periodKey: "test-monthly-payment",
        recipient,
      },
      {
        type: emailTypes.vipPaymentReminder,
        periodKey: "test-vip-reminder",
        recipient,
        vipPaidUntil: addMembershipDays(now, 5),
      },
      {
        type: emailTypes.vipDowngradeNotice,
        periodKey: "test-vip-downgrade",
        recipient,
        vipPaidUntil: addMembershipDays(now, -1),
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
            standardPaymentLink: STANDARD_PAYMENT_LINK,
            vipPaymentLink: VIP_PAYMENT_LINK,
            trialEndsAt: dueEmail.trialEndsAt?.toISOString(),
            vipPaidUntil: dueEmail.vipPaidUntil?.toISOString(),
          },
        },
      });
      if (dueEmail.type === emailTypes.vipDowngradeNotice) {
        await prisma.user.update({
          where: { id: dueEmail.recipient.id },
          data: { membershipTier: "STANDARD", vipStartedAt: null, vipPaidUntil: null },
        });
      }
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
  paymentLink: STANDARD_PAYMENT_LINK,
  standardPaymentLink: STANDARD_PAYMENT_LINK,
  vipPaymentLink: VIP_PAYMENT_LINK,
  paymentExplanation: PAYMENT_EXPLANATION,
  vipPaymentExplanation: VIP_PAYMENT_EXPLANATION,
  emailTypes,
  trialDays: TRIAL_DAYS,
  trialReminderDaysBeforeEnd: TRIAL_REMINDER_DAYS_BEFORE_END,
};
