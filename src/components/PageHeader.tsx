import { getSafeLocale, type Locale } from "@/i18n/config";
import { SiteMotion, type SiteMotionVariant } from "@/components/SiteMotion";

type PageHeaderProps = {
  title: string;
  description: string;
  locale?: Locale | string;
  motion?: SiteMotionVariant;
};

export function PageHeader({ title, description, locale = "tr", motion }: PageHeaderProps) {
  const safeLocale = getSafeLocale(locale);
  const platformLine = safeLocale === "tr" ? "Piyasa, eğitim ve skor yönetimi" : "Markets, education, and score tracking";
  const labels = safeLocale === "tr" ? ["Eğitim", "Analiz", "Liderlik", "Panel"] : ["Education", "Analysis", "Leaderboard", "Dashboard"];
  const motionVariant = motion ?? getHeaderMotionVariant(title);

  return (
    <section className="page-header-premium page-header-premium--modern glass-card overflow-hidden rounded-lg shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
        <div className="page-header-copy p-8 sm:p-10">
          <p className="page-header-kicker mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#0f766e]">Enbilir</p>
          <h1 className="text-3xl font-black tracking-normal text-[#152033] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
        </div>
        <div className="page-header-motion-panel premium-dark hidden p-8 text-white lg:block">
          <div className="grid h-full content-between gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5a623]">Platform</p>
              <p className="mt-3 text-2xl font-black">{platformLine}</p>
            </div>
            <div className="page-header-motion-stage">
              <SiteMotion variant={motionVariant} />
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {labels.map((label) => (
                <span key={label} className="rounded-md bg-white/10 p-3">{label}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function getHeaderMotionVariant(title: string): SiteMotionVariant {
  const normalizedTitle = title.toLocaleLowerCase("tr-TR");

  if (normalizedTitle.includes("ai") || normalizedTitle.includes("asistan")) return "pulse";
  if (normalizedTitle.includes("rapor") || normalizedTitle.includes("makro")) return "macro";
  if (normalizedTitle.includes("lig") || normalizedTitle.includes("lider")) return "community";
  if (normalizedTitle.includes("eğitim") || normalizedTitle.includes("egitim") || normalizedTitle.includes("içerik")) return "path";
  if (normalizedTitle.includes("işlem") || normalizedTitle.includes("islem") || normalizedTitle.includes("portföy")) return "bars";
  if (normalizedTitle.includes("sohbet") || normalizedTitle.includes("topluluk")) return "network";
  if (normalizedTitle.includes("kayıt") || normalizedTitle.includes("giriş") || normalizedTitle.includes("panel")) return "live";
  if (normalizedTitle.includes("kripto")) return "crypto";
  if (normalizedTitle.includes("iletişim")) return "dollar";

  return "trend";
}
