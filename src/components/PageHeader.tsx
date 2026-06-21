import { getSafeLocale, type Locale } from "@/i18n/config";

type PageHeaderProps = {
  title: string;
  description: string;
  locale?: Locale | string;
};

export function PageHeader({ title, description, locale = "tr" }: PageHeaderProps) {
  const safeLocale = getSafeLocale(locale);
  const platformLine = safeLocale === "tr" ? "Piyasa, eğitim ve skor yönetimi" : "Markets, education, and score tracking";
  const labels = safeLocale === "tr" ? ["Eğitim", "Analiz", "Liderlik", "Panel"] : ["Education", "Analysis", "Leaderboard", "Dashboard"];

  return (
    <section className="page-header-premium glass-card overflow-hidden rounded-lg shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
        <div className="p-8 sm:p-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#0f766e]">Enbilir</p>
          <h1 className="text-3xl font-black tracking-normal text-[#152033] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
        </div>
        <div className="premium-dark hidden p-8 text-white lg:block">
          <div className="grid h-full content-between gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5a623]">Platform</p>
              <p className="mt-3 text-2xl font-black">{platformLine}</p>
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
