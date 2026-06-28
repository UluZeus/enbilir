import { sendEmail } from "@/lib/email";
import { macroReportEventTypes } from "@/lib/ai-market/report-event-types";
import { recordMacroReportEvent } from "@/lib/ai-market/report-events";
import { getSiteUrl } from "@/lib/site-url";
import { getWeeklyCompetitionSummary } from "@/lib/weekly-competition-summary";

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

type SendWeeklyReportEmailsInput = {
  reportId: string;
  recipients: MorningReportRecipient[];
};

type WeeklyMailBlock = {
  text: string;
  html: string;
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

function getWeeklyLeadersArchiveUrl() {
  return `${getSiteUrl()}/tr/haftalik-liderler`;
}

function isMondayInIstanbul(now = new Date()) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "Europe/Istanbul",
  }).format(now) === "Mon";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatUsd(value: number) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRank(rank: number | null, emptyLabel: string) {
  return rank ? `${rank}. sıra` : emptyLabel;
}

async function buildWeeklyMailBlock(recipientId?: string): Promise<WeeklyMailBlock | null> {
  if (!isMondayInIstanbul()) {
    return null;
  }

  const summary = await getWeeklyCompetitionSummary("tr", recipientId);
  const archiveUrl = getWeeklyLeadersArchiveUrl();
  const weeklyRows = summary.weeklyTop.map((row) => `${row.rank}. ${row.displayName} - ${formatUsd(row.valueUsd)} (${row.returnPercent.toFixed(2)}%)`);
  const totalRows = summary.totalTop.map((row) => `${row.rank}. ${row.displayName} - ${formatUsd(row.valueUsd)} (${row.returnPercent.toFixed(2)}%)`);
  const weeklyList = weeklyRows.length > 0 ? weeklyRows : ["Bu hafta listelenecek işlem bulunamadı."];
  const totalList = totalRows.length > 0 ? totalRows : ["Henüz toplam liderlik verisi oluşmadı."];
  const text = [
    "",
    "Haftalık Enbilir liderlik özeti",
    `Dönem: ${summary.weekLabel}`,
    "",
    "Bu hafta en çok kazanç elde edenler:",
    ...weeklyList,
    "",
    "Toplamda en çok kazanç elde edenler:",
    ...totalList,
    "",
    `Sizin haftalık sıranız: ${formatRank(summary.currentUserWeeklyRank, "Bu hafta işlem/sıralama yok")}`,
    `Sizin genel sıranız: ${formatRank(summary.currentUserTotalRank, "Henüz sıralamada yok")}`,
    `Haftalık liderler arşivi: ${archiveUrl}`,
  ].join("\n");
  const htmlList = (rows: string[]) => rows.map((row) => `<li>${escapeHtml(row)}</li>`).join("");
  const html = `
    <div style="margin:22px 0;padding:18px;border:1px solid #d1bfa7;border-radius:14px;background:#fffaf6">
      <p style="margin:0 0 6px;font-size:12px;font-weight:900;letter-spacing:.12em;text-transform:uppercase;color:#8a6a5d">Haftalık Enbilir liderlik özeti</p>
      <p style="margin:0 0 12px;font-size:14px;color:#475569"><strong>Dönem:</strong> ${escapeHtml(summary.weekLabel)}</p>
      <p style="margin:0 0 6px;font-weight:900;color:#152033">Bu hafta en çok kazanç elde edenler</p>
      <ol style="margin:0 0 14px;padding-left:20px;color:#334155">${htmlList(weeklyList)}</ol>
      <p style="margin:0 0 6px;font-weight:900;color:#152033">Toplamda en çok kazanç elde edenler</p>
      <ol style="margin:0 0 14px;padding-left:20px;color:#334155">${htmlList(totalList)}</ol>
      <p style="margin:0;color:#152033"><strong>Sizin haftalık sıranız:</strong> ${escapeHtml(formatRank(summary.currentUserWeeklyRank, "Bu hafta işlem/sıralama yok"))}</p>
      <p style="margin:4px 0 0;color:#152033"><strong>Sizin genel sıranız:</strong> ${escapeHtml(formatRank(summary.currentUserTotalRank, "Henüz sıralamada yok"))}</p>
      <p style="margin:12px 0 0"><a href="${archiveUrl}" style="color:#0f766e;font-weight:700">Haftalık liderler arşivini aç</a></p>
    </div>
  `;

  return { text, html };
}

function getMorningMailText(name: string, reportUrl: string, reportsUrl: string, weeklyBlock?: WeeklyMailBlock | null) {
  return [
    `Merhaba ${name},`,
    "",
    REPORT_PREFACE,
    "",
    "Dr. Hakan Ünsal'ın hazırladığı sabah makro raporu yayında.",
    `Raporu buradan okuyabilirsiniz: ${reportUrl}`,
    weeklyBlock?.text ?? "",
    "",
    `Gün içinde Türkiye saatiyle 07.00, 12.00 ve 18.00'de yeni bir makro rapor oluşturulmaktadır. İsteyenler güncellenmiş en son rapora (${reportsUrl}) sayfasından ulaşabilirler.`,
    "",
    ...SIGNATURE_TEXT,
  ].join("\n");
}

function getMorningMailHtml(name: string, reportUrl: string, reportsUrl: string, weeklyBlock?: WeeklyMailBlock | null) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#152033">
      <p>Merhaba ${name},</p>
      <p style="font-size:13px;color:#475569">${REPORT_PREFACE}</p>
      <p><strong>Dr. Hakan Ünsal'ın hazırladığı sabah makro raporu yayında.</strong></p>
      <p><a href="${reportUrl}" style="color:#0f766e;font-weight:700">Makro raporu okumak için tıklayın</a></p>
      ${weeklyBlock?.html ?? ""}
      <p>Gün içinde Türkiye saatiyle <strong>07.00, 12.00 ve 18.00</strong>'de yeni bir makro rapor oluşturulmaktadır. İsteyenler güncellenmiş en son rapora (<a href="${reportsUrl}" style="color:#0f766e;font-weight:700">${reportsUrl}</a>) sayfasından ulaşabilirler.</p>
      <p>Saygılarımla...<br /><strong>Dr. Hakan Ünsal</strong><br /><a href="https://www.enbilir.com" style="color:#0f766e">www.enbilir.com</a></p>
    </div>
  `;
}

function getLatestMailText(name: string, reportUrl: string, reportsUrl: string, weeklyBlock?: WeeklyMailBlock | null) {
  return [
    `Merhaba ${name},`,
    "",
    REPORT_PREFACE,
    "",
    "Talebiniz üzerine en son üretilmiş makro raporu gönderiyoruz.",
    `Raporu buradan okuyabilirsiniz: ${reportUrl}`,
    weeklyBlock?.text ?? "",
    "",
    `Yeni raporlar Türkiye saatiyle 07.00, 12.00 ve 18.00'de hazırlanır. Güncel rapor arşivine (${reportsUrl}) sayfasından ulaşabilirsiniz.`,
    "",
    ...SIGNATURE_TEXT,
  ].join("\n");
}

function getLatestMailHtml(name: string, reportUrl: string, reportsUrl: string, weeklyBlock?: WeeklyMailBlock | null) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#152033">
      <p>Merhaba ${name},</p>
      <p style="font-size:13px;color:#475569">${REPORT_PREFACE}</p>
      <p><strong>Talebiniz üzerine en son üretilmiş makro raporu gönderiyoruz.</strong></p>
      <p><a href="${reportUrl}" style="color:#0f766e;font-weight:700">Makro raporu okumak için tıklayın</a></p>
      ${weeklyBlock?.html ?? ""}
      <p>Yeni raporlar Türkiye saatiyle <strong>07.00, 12.00 ve 18.00</strong>'de hazırlanır. Güncel rapor arşivine (<a href="${reportsUrl}" style="color:#0f766e;font-weight:700">${reportsUrl}</a>) sayfasından ulaşabilirsiniz.</p>
      <p>Saygılarımla...<br /><strong>Dr. Hakan Ünsal</strong><br /><a href="https://www.enbilir.com" style="color:#0f766e">www.enbilir.com</a></p>
    </div>
  `;
}

function getWeeklyReportMailText(name: string, reportUrl: string, reportsUrl: string, weeklyBlock?: WeeklyMailBlock | null) {
  return [
    `Merhaba ${name},`,
    "",
    REPORT_PREFACE,
    "",
    "HAFTALIK RAPOR BY DR. HAKAN ÜNSAL yayında.",
    "Bu rapor pazartesi günleri, bir önceki haftada piyasalarda olanları ve içinde bulunulan haftada takip edilmesi gereken makro başlıkları daha geniş bir perspektifle değerlendirmek için hazırlanır.",
    "",
    `Haftalık raporu buradan okuyabilirsiniz: ${reportUrl}`,
    weeklyBlock?.text ?? "",
    "",
    `Günlük makro raporlar ayrıca 07.00, 12.00 ve 18.00'de çıkmaya devam eder. Tüm rapor arşivi: ${reportsUrl}`,
    "",
    ...SIGNATURE_TEXT,
  ].join("\n");
}

function getWeeklyReportMailHtml(name: string, reportUrl: string, reportsUrl: string, weeklyBlock?: WeeklyMailBlock | null) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#152033">
      <p>Merhaba ${name},</p>
      <p style="font-size:13px;color:#475569">${REPORT_PREFACE}</p>
      <p style="font-size:18px;font-weight:900;color:#111827">HAFTALIK RAPOR BY DR. HAKAN ÜNSAL yayında.</p>
      <p>Bu rapor pazartesi günleri, bir önceki haftada piyasalarda olanları ve içinde bulunulan haftada takip edilmesi gereken makro başlıkları daha geniş bir perspektifle değerlendirmek için hazırlanır.</p>
      <p><a href="${reportUrl}" style="color:#0f766e;font-weight:700">Haftalık raporu okumak için tıklayın</a></p>
      ${weeklyBlock?.html ?? ""}
      <p>Günlük makro raporlar ayrıca Türkiye saatiyle <strong>07.00, 12.00 ve 18.00</strong>'de çıkmaya devam eder. Tüm rapor arşivine (<a href="${reportsUrl}" style="color:#0f766e;font-weight:700">${reportsUrl}</a>) sayfasından ulaşabilirsiniz.</p>
      <p>Saygılarımla...<br /><strong>Dr. Hakan Ünsal</strong><br /><a href="https://www.enbilir.com" style="color:#0f766e">www.enbilir.com</a></p>
    </div>
  `;
}

export async function sendMorningMacroReportEmails({ reportId, recipients }: SendMorningReportEmailsInput) {
  const reportUrl = getReportUrl(reportId);
  const reportsUrl = getReportsUrl();
  const uniqueRecipients = Array.from(new Map(recipients.map((recipient) => [recipient.email.toLowerCase(), recipient])).values());
  const settled = await Promise.allSettled(
    uniqueRecipients.map(async (recipient) => {
      const weeklyBlock = await buildWeeklyMailBlock(recipient.id);

      return sendEmail({
        to: recipient.email,
        subject: "Dr. Hakan Ünsal'ın sabah makro raporu yayında",
        text: getMorningMailText(recipient.name, reportUrl, reportsUrl, weeklyBlock),
        html: getMorningMailHtml(recipient.name, reportUrl, reportsUrl, weeklyBlock),
      });
    }),
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

export async function sendWeeklyMacroReportEmails({ reportId, recipients }: SendWeeklyReportEmailsInput) {
  const reportUrl = getReportUrl(reportId);
  const reportsUrl = getReportsUrl();
  const uniqueRecipients = Array.from(new Map(recipients.map((recipient) => [recipient.email.toLowerCase(), recipient])).values());
  const settled = await Promise.allSettled(
    uniqueRecipients.map(async (recipient) => {
      const weeklyBlock = await buildWeeklyMailBlock(recipient.id);

      return sendEmail({
        to: recipient.email,
        subject: "HAFTALIK RAPOR BY DR. HAKAN ÜNSAL",
        text: getWeeklyReportMailText(recipient.name, reportUrl, reportsUrl, weeklyBlock),
        html: getWeeklyReportMailHtml(recipient.name, reportUrl, reportsUrl, weeklyBlock),
      });
    }),
  );

  await Promise.all(
    settled.map((result, index) =>
      recordMacroReportEvent({
        reportId,
        userId: uniqueRecipients[index]?.id,
        eventType: result.status === "fulfilled" ? macroReportEventTypes.emailSent : macroReportEventTypes.emailFailed,
        metadata: {
          source: "weekly-monday-cron",
          emailKind: "weekly-report",
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
  const weeklyBlock = await buildWeeklyMailBlock(recipient.id);

  await sendEmail({
    to: recipient.email,
    subject: "Talep ettiğiniz son makro rapor",
    text: getLatestMailText(recipient.name, reportUrl, reportsUrl, weeklyBlock),
    html: getLatestMailHtml(recipient.name, reportUrl, reportsUrl, weeklyBlock),
  });

  return { sent: true as const };
}
