import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { sendEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { getSiteUrl } from "@/lib/site-url";

const EMAIL_DELIVERY_LEASE_MS = 30 * 60 * 1000;

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function assetClassLabel(assetClass: string) {
  return ({
    EQUITY: "Hisse",
    BROAD_MARKET: "Geniş piyasa",
    COMMODITY: "Emtia",
    BOND: "Tahvil",
    FX: "Döviz",
    CRYPTO: "Kripto",
  } as Record<string, string>)[assetClass] ?? assetClass;
}

async function claimEmailDelivery(reportId: string, recipient: { id: string; email: string }) {
  const claimedAt = new Date();

  try {
    await prisma.vipResearchEmailLog.create({
      data: {
        reportId,
        userId: recipient.id,
        email: recipient.email,
        status: "SENDING",
        sentAt: claimedAt,
      },
    });
    return true;
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
      throw error;
    }
  }

  const staleBefore = new Date(claimedAt.getTime() - EMAIL_DELIVERY_LEASE_MS);
  const claimed = await prisma.vipResearchEmailLog.updateMany({
    where: {
      reportId,
      userId: recipient.id,
      OR: [
        { status: "FAILED" },
        { status: "SENDING", sentAt: { lt: staleBefore } },
      ],
    },
    data: {
      email: recipient.email,
      status: "SENDING",
      error: null,
      sentAt: claimedAt,
    },
  });

  return claimed.count === 1;
}

export async function sendVipResearchEmails(reportId: string) {
  const now = new Date();
  const [report, recipients] = await Promise.all([
    prisma.vipResearchReport.findUnique({
      where: { id: reportId },
      include: { ideas: { orderBy: { rank: "asc" }, take: 5 } },
    }),
    prisma.user.findMany({
      where: { isActive: true, membershipTier: "VIP", vipPaidUntil: { gt: now } },
      select: { id: true, email: true, name: true },
    }),
  ]);

  if (!report) {
    throw new Error("VIP raporu bulunamadı.");
  }

  const reportUrl = `${getSiteUrl()}/tr/vip/raporlar/${report.id}`;
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    if (!await claimEmailDelivery(reportId, recipient)) {
      continue;
    }

    const rows = report.ideas.map((idea) => `
      <tr>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0;font-weight:800">${idea.rank}. ${escapeHtml(idea.symbol)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(assetClassLabel(idea.assetClass))}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0">${escapeHtml(idea.stance)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0">${idea.confidenceScore}/100</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0">${idea.riskScore}/100</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0">${formatPrice(idea.entryLow)}-${formatPrice(idea.entryHigh)}</td>
        <td style="padding:10px;border-bottom:1px solid #e2e8f0">${formatPrice(idea.stopLoss)} / ${formatPrice(idea.targetPrice)}</td>
      </tr>`).join("");
    const text = [
      `Merhaba ${recipient.name},`,
      "",
      "Enbilir VIP Asimetrik Fırsatlar raporu hazırlandı.",
      report.executiveSummary,
      "",
      ...report.ideas.map((idea) => `${idea.rank}. ${idea.symbol} · ${assetClassLabel(idea.assetClass)} · ${idea.stance} · Güven ${idea.confidenceScore}/100 · Risk ${idea.riskScore}/100 · Giriş ${formatPrice(idea.entryLow)}-${formatPrice(idea.entryHigh)} · Stop ${formatPrice(idea.stopLoss)} · Hedef ${formatPrice(idea.targetPrice)}`),
      "",
      `Tam rapor ve performans takibi: ${reportUrl}`,
      "",
      report.disclaimer,
    ].join("\n");
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#172033;max-width:760px;margin:auto">
        <p>Merhaba ${escapeHtml(recipient.name)},</p>
        <p style="font-size:12px;font-weight:900;letter-spacing:.16em;color:#8a6418">ENBİLİR VIP · ASİMETRİK FIRSATLAR</p>
        <h1 style="font-size:24px;margin:6px 0 12px">Gürültüsüz, iki ayaklı sabah araştırması</h1>
        <p>${escapeHtml(report.executiveSummary)}</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#172033;color:white"><th>Sembol</th><th>Tür</th><th>Not</th><th>Güven</th><th>Risk</th><th>Giriş</th><th>Stop / Hedef</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin:24px 0"><a href="${reportUrl}" style="display:inline-block;background:#b58a32;color:white;text-decoration:none;padding:13px 20px;border-radius:10px;font-weight:900">Tam VIP raporu ve performansı aç</a></p>
        <p style="font-size:12px;color:#64748b">${escapeHtml(report.disclaimer)}</p>
      </div>`;

    try {
      await sendEmail({ to: recipient.email, subject: "Enbilir VIP sabah araştırması: Asimetrik fırsatlar", text, html });
      await prisma.vipResearchEmailLog.upsert({
        where: { reportId_userId: { reportId, userId: recipient.id } },
        create: { reportId, userId: recipient.id, email: recipient.email, status: "SENT" },
        update: { email: recipient.email, status: "SENT", error: null, sentAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      await prisma.vipResearchEmailLog.upsert({
        where: { reportId_userId: { reportId, userId: recipient.id } },
        create: { reportId, userId: recipient.id, email: recipient.email, status: "FAILED", error: error instanceof Error ? error.message : "E-posta gönderilemedi." },
        update: { status: "FAILED", error: error instanceof Error ? error.message : "E-posta gönderilemedi.", sentAt: new Date() },
      });
      failed += 1;
    }
  }

  return { recipients: recipients.length, sent, failed };
}
