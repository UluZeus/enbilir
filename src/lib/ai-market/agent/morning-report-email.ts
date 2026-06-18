import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

type MorningReportRecipient = {
  email: string;
  name: string;
};

type SendMorningReportEmailsInput = {
  reportId: string;
  recipients: MorningReportRecipient[];
};

function getReportUrl(reportId: string) {
  return `${getSiteUrl()}/tr/ai-piyasa-asistani/raporlar/${reportId}`;
}

function getReportsUrl() {
  return `${getSiteUrl()}/tr/ai-piyasa-asistani/raporlar`;
}

function getMailText(name: string, reportUrl: string, reportsUrl: string) {
  return [
    `Merhaba ${name},`,
    "",
    "Dr. Hakan Ünsal'ın hazırladığı sabah makro raporu yayında.",
    `Raporu buradan okuyabilirsiniz: ${reportUrl}`,
    "",
    `Gün içinde ortalama her üç saatte bir sitede yeni bir makro rapor oluşturulmaktadır. İsteyenler güncellenmiş bu rapora (${reportsUrl}) sayfasından ulaşabilirler.`,
    "",
    "Buradaki yorumlar ve tavsiyeler asla yatırım tavsiyesi niteliğinde olmayıp Dr. Hakan Ünsal'ın kendi bilgisiyle oluşturduğu yorumlarıdır. Piyasa verileri gecikmeli, eksik veya hatalı olabilir; karar almadan önce bağımsız kaynaklarla doğrulama yapılmalıdır.",
    "",
    "Dr. Hakan Ünsal",
    "www.enbilir.com",
  ].join("\n");
}

function getMailHtml(name: string, reportUrl: string, reportsUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#152033">
      <p>Merhaba ${name},</p>
      <p><strong>Dr. Hakan Ünsal'ın hazırladığı sabah makro raporu yayında.</strong></p>
      <p><a href="${reportUrl}" style="color:#0f766e;font-weight:700">Makro raporu okumak için tıklayın</a></p>
      <p>Gün içinde ortalama her üç saatte bir sitede yeni bir makro rapor oluşturulmaktadır. İsteyenler güncellenmiş bu rapora (<a href="${reportsUrl}" style="color:#0f766e;font-weight:700">${reportsUrl}</a>) sayfasından ulaşabilirler.</p>
      <p style="font-size:12px;color:#64748b">Buradaki yorumlar ve tavsiyeler asla yatırım tavsiyesi niteliğinde olmayıp Dr. Hakan Ünsal'ın kendi bilgisiyle oluşturduğu yorumlarıdır. Piyasa verileri gecikmeli, eksik veya hatalı olabilir; karar almadan önce bağımsız kaynaklarla doğrulama yapılmalıdır.</p>
      <p><strong>Dr. Hakan Ünsal</strong><br /><a href="https://www.enbilir.com" style="color:#0f766e">www.enbilir.com</a></p>
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
        text: getMailText(recipient.name, reportUrl, reportsUrl),
        html: getMailHtml(recipient.name, reportUrl, reportsUrl),
      }),
    ),
  );

  return {
    attempted: uniqueRecipients.length,
    sent: settled.filter((result) => result.status === "fulfilled").length,
    failed: settled.filter((result) => result.status === "rejected").length,
  };
}
