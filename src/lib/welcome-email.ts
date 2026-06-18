import { sendEmail } from "@/lib/email";
import { getSiteUrl } from "@/lib/site-url";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function buildGoogleWelcomeEmail({ name }: { name: string }) {
  const safeName = name.trim() || "Değerli üyemiz";
  const escapedName = escapeHtml(safeName);
  const siteUrl = getSiteUrl();
  const panelUrl = `${siteUrl}/tr/panel`;
  const subject = "Enbilir'e hoş geldiniz";
  const text = [
    `Merhaba ${safeName},`,
    "",
    "Enbilir'e hoş geldiniz.",
    "",
    "Google hesabınızla üyeliğiniz başarıyla oluşturuldu. Artık sanal portföyünüzü, AI piyasa asistanını, makro raporları ve eğitim içeriklerini tek hesabınızla kullanabilirsiniz.",
    "",
    `Başlamak için panelinize gidebilirsiniz: ${panelUrl}`,
    "",
    "Bu platform eğitim, simülasyon ve finansal farkındalık amacıyla hazırlanmıştır; gerçek para işlemi veya yatırım tavsiyesi içermez.",
    "",
    "Hoş geldiniz,",
    "Dr. Hakan Ünsal",
    "www.enbilir.com",
  ].join("\n");
  const html = `
    <div style="margin:0;padding:0;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#152033;">
      <div style="max-width:640px;margin:0 auto;padding:28px 16px;">
        <div style="overflow:hidden;border-radius:20px;border:1px solid #dbe4ef;background:#ffffff;box-shadow:0 18px 45px rgba(15,23,42,0.10);">
          <div style="background:#101827;padding:28px;color:#ffffff;">
            <p style="margin:0 0 8px 0;color:#f5a623;font-size:12px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;">Enbilir</p>
            <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:900;">Hoş geldiniz</h1>
            <p style="margin:14px 0 0 0;color:#d7dee9;font-size:15px;line-height:1.7;">Google hesabınızla Enbilir üyeliğiniz başarıyla oluşturuldu.</p>
          </div>
          <div style="padding:28px;">
            <p style="margin:0 0 16px 0;font-size:16px;line-height:1.7;">Merhaba <strong>${escapedName}</strong>,</p>
            <p style="margin:0 0 16px 0;font-size:15px;line-height:1.7;color:#334155;">
              Enbilir ailesine katıldığınız için çok mutlu olduk. Sanal portföyünüzle pratik yapabilir, AI piyasa asistanını kullanabilir, makro raporları takip edebilir ve finansal okuryazarlık yolculuğunuzu eğitim amaçlı bir ortamda sürdürebilirsiniz.
            </p>
            <p style="margin:0 0 22px 0;">
              <a href="${panelUrl}" style="display:inline-block;border-radius:12px;background:#0f766e;color:#ffffff;text-decoration:none;padding:14px 22px;font-weight:900;font-size:15px;">
                Panelime Git
              </a>
            </p>
            <p style="margin:0 0 22px 0;font-size:13px;line-height:1.6;color:#64748b;">
              Not: Enbilir eğitim, simülasyon ve finansal farkındalık amacıyla hazırlanmıştır; gerçek para işlemi veya yatırım tavsiyesi içermez.
            </p>
            <p style="margin:0;font-size:15px;line-height:1.7;color:#152033;">
              Hoş geldiniz,<br />
              <strong>Dr. Hakan Ünsal</strong><br />
              <a href="https://www.enbilir.com" style="color:#0f766e;text-decoration:none;">www.enbilir.com</a>
            </p>
          </div>
        </div>
      </div>
    </div>
  `;

  return { subject, text, html };
}

export async function sendGoogleWelcomeEmail({ to, name }: { to: string; name: string }) {
  const message = buildGoogleWelcomeEmail({ name });

  return sendEmail({
    to,
    subject: message.subject,
    text: message.text,
    html: message.html,
  });
}
