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

type SendLatestReportEmailInput = {
  reportId: string;
  recipient: MorningReportRecipient;
};

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
    "Dr. Hakan Ünsal'ın hazırladığı sabah makro raporu yayında.",
    `Raporu buradan okuyabilirsiniz: ${reportUrl}`,
    "",
    `Gün içinde Türkiye saatiyle 07.00, 12.00 ve 18.00'de yeni bir makro rapor oluşturulmaktadır. İsteyenler güncellenmiş en son rapora (${reportsUrl}) sayfasından ulaşabilirler.`,
    "",
    "Buradaki yorumlar ve tavsiyeler asla yatırım tavsiyesi niteliğinde olmayıp Dr. Hakan Ünsal'ın kendi bilgisiyle oluşturduğu yorumlarıdır. Piyasa verileri gecikmeli, eksik veya hatalı olabilir; karar almadan önce bağımsız kaynaklarla doğrulama yapılmalıdır.",
    "",
    "Dr. Hakan Ünsal",
    "www.enbilir.com",
  ].join("\n");
}

function getMorningMailHtml(name: string, reportUrl: string, reportsUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#152033">
      <p>Merhaba ${name},</p>
      <p><strong>Dr. Hakan Ünsal'ın hazırladığı sabah makro raporu yayında.</strong></p>
      <p><a href="${reportUrl}" style="color:#0f766e;font-weight:700">Makro raporu okumak için tıklayın</a></p>
      <p>Gün içinde Türkiye saatiyle <strong>07.00, 12.00 ve 18.00</strong>'de yeni bir makro rapor oluşturulmaktadır. İsteyenler güncellenmiş en son rapora (<a href="${reportsUrl}" style="color:#0f766e;font-weight:700">${reportsUrl}</a>) sayfasından ulaşabilirler.</p>
      <p style="font-size:12px;color:#64748b">Buradaki yorumlar ve tavsiyeler asla yatırım tavsiyesi niteliğinde olmayıp Dr. Hakan Ünsal'ın kendi bilgisiyle oluşturduğu yorumlarıdır. Piyasa verileri gecikmeli, eksik veya hatalı olabilir; karar almadan önce bağımsız kaynaklarla doğrulama yapılmalıdır.</p>
      <p><strong>Dr. Hakan Ünsal</strong><br /><a href="https://www.enbilir.com" style="color:#0f766e">www.enbilir.com</a></p>
    </div>
  `;
}

function getLatestMailText(name: string, reportUrl: string, reportsUrl: string) {
  return [
    `Merhaba ${name},`,
    "",
    "Talebiniz üzerine en son üretilmiş makro raporu gönderiyoruz.",
    `Raporu buradan okuyabilirsiniz: ${reportUrl}`,
    "",
    `Yeni raporlar Türkiye saatiyle 07.00, 12.00 ve 18.00'de hazırlanır. Güncel rapor arşivine (${reportsUrl}) sayfasından ulaşabilirsiniz.`,
    "",
    "Buradaki yorumlar ve tavsiyeler asla yatırım tavsiyesi niteliğinde olmayıp Dr. Hakan Ünsal'ın kendi bilgisiyle oluşturduğu yorumlarıdır. Piyasa verileri gecikmeli, eksik veya hatalı olabilir; karar almadan önce bağımsız kaynaklarla doğrulama yapılmalıdır.",
    "",
    "Dr. Hakan Ünsal",
    "www.enbilir.com",
  ].join("\n");
}

function getLatestMailHtml(name: string, reportUrl: string, reportsUrl: string) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#152033">
      <p>Merhaba ${name},</p>
      <p><strong>Talebiniz üzerine en son üretilmiş makro raporu gönderiyoruz.</strong></p>
      <p><a href="${reportUrl}" style="color:#0f766e;font-weight:700">Makro raporu okumak için tıklayın</a></p>
      <p>Yeni raporlar Türkiye saatiyle <strong>07.00, 12.00 ve 18.00</strong>'de hazırlanır. Güncel rapor arşivine (<a href="${reportsUrl}" style="color:#0f766e;font-weight:700">${reportsUrl}</a>) sayfasından ulaşabilirsiniz.</p>
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
        text: getMorningMailText(recipient.name, reportUrl, reportsUrl),
        html: getMorningMailHtml(recipient.name, reportUrl, reportsUrl),
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
