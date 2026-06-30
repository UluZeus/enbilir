import { NextResponse } from "next/server";
import {
  formatRiskScore,
  getRecommendedNextStepsForLocale,
  getRiskLegalWarningForLocale,
  getRiskProfileByKeyForLocale,
} from "@/data/risk-appetite-test";
import { getSafeLocale } from "@/i18n/config";
import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as { email?: string; averageScore?: string | number; profileKey?: string; locale?: string } | null;
  const email = body?.email?.trim() ?? "";
  const score = Number(body?.averageScore);
  const locale = getSafeLocale(body?.locale ?? "tr");
  const profile = getRiskProfileByKeyForLocale(body?.profileKey ?? "", locale);
  const legalWarning = getRiskLegalWarningForLocale(locale);
  const recommendedNextSteps = getRecommendedNextStepsForLocale(locale);
  const isEnglish = locale === "en";

  if (!emailPattern.test(email)) {
    return NextResponse.json({ ok: false, message: isEnglish ? "A valid email address is required." : "Geçerli bir e-posta adresi girilmelidir." }, { status: 400 });
  }

  if (!profile || !Number.isFinite(score) || score < 1 || score > 5) {
    return NextResponse.json({ ok: false, message: isEnglish ? "Report data is missing or invalid." : "Rapor bilgileri eksik veya geçersiz." }, { status: 400 });
  }

  const siteUrl = getSiteUrl();
  const scoreLabel = formatRiskScore(score);
  const nextStepsText = recommendedNextSteps.map((step) => `- ${step.title}: ${siteUrl}/${locale}${step.href}`).join("\n");
  const text = [
    isEnglish ? "Enbilir Risk Appetite Test Report Summary" : "Enbilir Risk İştahı Testi Rapor Özeti",
    "",
    `${isEnglish ? "Average score" : "Ortalama puan"}: ${scoreLabel}`,
    `${isEnglish ? "Risk type" : "Risk tipi"}: ${profile.title}`,
    "",
    profile.reportIntro,
    "",
    isEnglish ? "Virtual portfolio suggestions:" : "Sanal portföy önerileri:",
    ...profile.portfolioSuggestions.map((item) => `- ${item}`),
    "",
    isEnglish ? "Next steps in Enbilir:" : "Enbilir içinde sonraki adımlar:",
    nextStepsText,
    "",
    legalWarning,
  ].join("\n");
  const suggestionsHtml = profile.portfolioSuggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  const stepsHtml = recommendedNextSteps
    .map((step) => `<li><a href="${siteUrl}/${locale}${step.href}" style="color:#0f766e;font-weight:700">${escapeHtml(step.title)}</a></li>`)
    .join("");
  const html = `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px;color:#152033">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
        <div style="background:#08111f;color:#ffffff;padding:24px">
          <p style="margin:0 0 8px;color:#67e8f9;font-weight:800;letter-spacing:.08em;text-transform:uppercase">${isEnglish ? "Enbilir Risk Appetite Test" : "Enbilir Risk İştahı Testi"}</p>
          <h1 style="margin:0;font-size:28px">${escapeHtml(profile.title)}</h1>
          <p style="margin:12px 0 0;font-size:16px"><strong>${isEnglish ? "Average score" : "Ortalama puan"}:</strong> ${escapeHtml(scoreLabel)}</p>
        </div>
        <div style="padding:24px">
          <p style="line-height:1.7">${escapeHtml(profile.reportIntro)}</p>
          <h2 style="font-size:18px">${isEnglish ? "Virtual portfolio suggestions" : "Sanal portföy önerileri"}</h2>
          <ul style="line-height:1.7">${suggestionsHtml}</ul>
          <h2 style="font-size:18px">${isEnglish ? "Next steps in Enbilir" : "Enbilir içinde sonraki adımlar"}</h2>
          <ul style="line-height:1.7">${stepsHtml}</ul>
          <p style="margin-top:20px;padding:14px;background:#fffbeb;border:1px solid #fde68a;border-radius:12px;line-height:1.6">${escapeHtml(legalWarning)}</p>
          <p style="font-size:12px;color:#64748b">${isEnglish ? "Your email address was used only to send this report; it is not stored for marketing without your explicit consent." : "E-posta adresiniz yalnızca bu raporu göndermek için kullanılmıştır; açık rızanız olmadan pazarlama amacıyla saklanmaz."}</p>
        </div>
      </div>
    </div>
  `;

  await sendEmail({
    to: email,
    subject: `${isEnglish ? "Enbilir Risk Appetite Test" : "Enbilir Risk İştahı Testi"}: ${profile.title}`,
    text,
    html,
  });

  return NextResponse.json({ ok: true, message: isEnglish ? "The report summary was sent to your email address." : "Rapor özeti e-posta adresine gönderildi." });
}
