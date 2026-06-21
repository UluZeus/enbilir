import { sendEmail } from "@/lib/email";
import { macroReportEventTypes } from "@/lib/ai-market/report-event-types";
import { recordMacroReportEvent } from "@/lib/ai-market/report-events";
import { getSiteUrl } from "@/lib/site-url";

type MorningReportRecipient = {
  id?: string;
  email: string;
  name: string;
};

type SendMorningReportEmailsInput = {
  reportId: string;
  recipients: MorningReportRecipient[];
};

type SendLatestReportEmailInput = {
  reportId: string;
  recipient: MorningReportRecipient;
};

const REPORT_PREFACE =
  "Burada yazan tüm yazı ve düşünceler yatırım tavsiyesi niteliğinde olmayıp sadece Dr. Hakan Ünsal'ın kişisel görüşlerini yansıtmaktadır. Ayrıca yapay zeka çıktısı da yine Dr. Hakan Ünsal'ın eğittiği bir yapay zeka ajanı olduğu dikkate alınmalıdır. Yapay zeka hata yapabilir, buradaki bazı değerler gecikmeli olabilir ve bir başka kaynaktan da doğrulamakta her zaman fayda vardır.";

const SIGNATURE_TEXT = ["Saygılarımla...", "Dr. Hakan Ünsal", "www.enbilir.com"];

function getReportUrl(reportId: string) {
  return `${getSiteUrl()}/tr/ai-piyasa-asistani/raporlar/${reportId}`;
}

function getReportsUrl() {
  return `${getSiteUrl()}/tr/ai-piyasa-asistani/raporlar`;
}

function getMorningMailText(name: string, reportUrl: string, reportsUrl: string) {
  return [
    `Merhaba ${name},`,
    "",
    REPORT_PREFACE,
    "",
    "Dr. Hakan Ünsal'ın hazırladığı sabah makro raporu yayında.",
    `Raporu buradan okuyabilirsiniz: ${reportUrl}`,
    "",
    `Gün içinde Türkiye saatiyle 07.00, 12.00 ve 18.00'de yeni bir makro rapor oluşturulmaktadır. İsteyenler güncellenmiş en son rapora (${reportsUrl}) sayfasından ulaşabilirler.`,
    "",
    ...SIGNATURE_TEXT,
  ].join("\n");
}

function getMorningMailHtml(name: string, reportUrl: string, reportsUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#152033">
      <p>Merhaba ${name},</p>
      <p style="font-size:13px;color:#475569">${REPORT_PREFACE}</p>
      <p><strong>Dr. Hakan Ünsal'ın hazırladığı sabah makro raporu yayında.</strong></p>
      <p><a href="${reportUrl}" style="color:#0f766e;font-weight:700">Makro raporu okumak için tıklayın</a></p>
      <p>Gün içinde Türkiye saatiyle <strong>07.00, 12.00 ve 18.00</strong>'de yeni bir makro rapor oluşturulmaktadır. İsteyenler güncellenmiş en son rapora (<a href="${reportsUrl}" style="color:#0f766e;font-weight:700">${reportsUrl}</a>) sayfasından ulaşabilirler.</p>
      <p>Saygılarımla...<br /><strong>Dr. Hakan Ünsal</strong><br /><a href="https://www.enbilir.com" style="color:#0f766e">www.enbilir.com</a></p>
    </div>
  `;
}

function getLatestMailText(name: string, reportUrl: string, reportsUrl: string) {
  return [
    `Merhaba ${name},`,
    "",
    REPORT_PREFACE,
    "",
    "Talebiniz üzerine en son üretilmiş makro raporu gönderiyoruz.",
    `Raporu buradan okuyabilirsiniz: ${reportUrl}`,
    "",
    `Yeni raporlar Türkiye saatiyle 07.00, 12.00 ve 18.00'de hazırlanır. Güncel rapor arşivine (${reportsUrl}) sayfasından ulaşabilirsiniz.`,
    "",
    ...SIGNATURE_TEXT,
  ].join("\n");
}

function getLatestMailHtml(name: string, reportUrl: string, reportsUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#152033">
      <p>Merhaba ${name},</p>
      <p style="font-size:13px;color:#475569">${REPORT_PREFACE}</p>
      <p><strong>Talebiniz üzerine en son üretilmiş makro raporu gönderiyoruz.</strong></p>
      <p><a href="${reportUrl}" style="color:#0f766e;font-weight:700">Makro raporu okumak için tıklayın</a></p>
      <p>Yeni raporlar Türkiye saatiyle <strong>07.00, 12.00 ve 18.00</strong>'de hazırlanır. Güncel rapor arşivine (<a href="${reportsUrl}" style="color:#0f766e;font-weight:700">${reportsUrl}</a>) sayfasından ulaşabilirsiniz.</p>
      <p>Saygılarımla...<br /><strong>Dr. Hakan Ünsal</strong><br /><a href="https://www.enbilir.com" style="color:#0f766e">www.enbilir.com</a></p>
    </div>
  `;
}

export async function sendMorningMacroReportEmails({ reportId, recipients }: SendMorningReportEmailsInput) {
  const reportUrl = getReportUrl(reportId);
  const reportsUrl = getReportsUrl();
  const uniqueRecipients = Array.from(new Map(recipients.map((recipient) => [recipient.email.toLowerCase(), recipient])).values());
  const settled = await Promise.allSettled(
    uniqueRecipients.map((recipient) =>
      sendEmail({
        to: recipient.email,
        subject: "Dr. Hakan Ünsal'ın sabah makro raporu yayında",
        text: getMorningMailText(recipient.name, reportUrl, reportsUrl),
        html: getMorningMailHtml(recipient.name, reportUrl, reportsUrl),
      }),
    ),
  );

  await Promise.all(
    settled.map((result, index) =>
      recordMacroReportEvent({
        reportId,
        userId: uniqueRecipients[index]?.id,
        eventType: result.status === "fulfilled" ? macroReportEventTypes.emailSent : macroReportEventTypes.emailFailed,
        metadata: {
          source: "morning-cron",
          recipientEmail: uniqueRecipients[index]?.email,
          message: result.status === "rejected" && result.reason instanceof Error ? result.reason.message : null,
        },
      }),
    ),
  );

  return {
    attempted: uniqueRecipients.length,
    sent: settled.filter((result) => result.status === "fulfilled").length,
    failed: settled.filter((result) => result.status === "rejected").length,
  };
}

export async function sendLatestMacroReportEmail({ reportId, recipient }: SendLatestReportEmailInput) {
  const reportUrl = getReportUrl(reportId);
  const reportsUrl = getReportsUrl();

  await sendEmail({
    to: recipient.email,
    subject: "Talep ettiğiniz son makro rapor",
    text: getLatestMailText(recipient.name, reportUrl, reportsUrl),
    html: getLatestMailHtml(recipient.name, reportUrl, reportsUrl),
  });

  return { sent: true as const };
}
