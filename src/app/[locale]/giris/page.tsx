import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMessage } from "@/components/FormMessage";
import { PasswordField } from "@/components/PasswordField";
import { getSafeLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getUiCopy } from "@/i18n/ui-copy";
import { loginAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/giris", page: "login" });
}

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const sessionUser = await getSessionUser();
  if (sessionUser) redirect(`/${locale}/panel`);
  const dictionary = getDictionary(locale);
  const copy = getUiCopy(locale).auth;
  const isDevelopment = process.env.NODE_ENV !== "production";
  const devLoginHref = `/api/auth/dev-login?locale=${locale}&returnTo=${encodeURIComponent(`/${locale}/baslangic`)}`;

  return (
    <div className="grid gap-6">
      <section className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="auth-login-story order-2 premium-card premium-card--dark p-6 lg:order-1">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">
            {locale === "tr" ? "Geri dön ve ritmi yakala" : "Return and catch the rhythm"}
          </p>
          <h2 className="mt-3 text-3xl font-black">
            {locale === "tr" ? "Portföyün, liglerin ve AI raporların seni bekliyor." : "Your portfolio, leagues, and AI reports are waiting."}
          </h2>
          <div className="mt-5 grid gap-3">
            {(locale === "tr"
              ? [
                  ["Sanal bakiye", "Gerçek para riski olmadan karar pratiğine devam et."],
                  ["Makro raporlar", "07.00, 12.00 ve 18.00 rapor ritmini kaçırma."],
                  ["Topluluk", "Ligindeki sıralamanı ve arkadaş performanslarını izle."],
                ]
              : [
                  ["Virtual balance", "Continue practicing decisions without real-money risk."],
                  ["Macro reports", "Keep up with the 07:00, 12:00, and 18:00 report rhythm."],
                  ["Community", "Track your league ranking and friend performance."],
                ]
            ).map(([title, body]) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-black text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
        <form action={loginAction} className="auth-conversion-form order-1 grid w-full gap-4 rounded-[1.35rem] border border-slate-200 bg-white p-6 shadow-sm lg:order-2">
          <div className="auth-form-intro rounded-2xl p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#bd8c7d]">
              {locale === "tr" ? "Güvenli giriş" : "Secure sign in"}
            </p>
            <h1 className="mt-2 text-2xl font-black text-[#152033]">{dictionary.pages.login.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {locale === "tr" ? "Google ile hızlı giriş yapabilir veya e-posta hesabınla devam edebilirsin." : "Use Google for a fast sign-in or continue with your email account."}
            </p>
          </div>
          <FormMessage message={query.error ?? query.message} tone={query.message ? "success" : "error"} />
          <a
            href={`/api/auth/google/start?locale=${locale}&returnTo=${encodeURIComponent(`/${locale}/baslangic`)}`}
            className="rounded-md border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-[#152033] shadow-sm hover:border-[#0f766e] hover:text-[#0f766e]"
          >
            {copy.google}
          </a>
          {isDevelopment ? (
            <a
              href={devLoginHref}
              className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-5 py-3 text-center text-sm font-black text-amber-900 shadow-sm hover:border-amber-500 hover:bg-amber-100"
            >
              {locale === "tr" ? "Geliştirme girişi" : "Development login"}
            </a>
          ) : null}
          <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            {copy.or}
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <input type="hidden" name="locale" value={locale} />
          <label className="grid gap-2 text-sm font-bold text-slate-700">
            {copy.email}
            <input name="email" type="email" required autoComplete="email" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100" />
          </label>
          <PasswordField label={copy.password} locale={locale} autoComplete="current-password" />
          <button className="premium-cta px-5 py-3 text-sm font-black">{copy.login}</button>
          <p className="text-center text-sm text-slate-600">
            {locale === "tr" ? "Henüz hesabın yok mu?" : "No account yet?"}{" "}
            <Link href={`/${locale}/kayit`} className="font-black text-[#0f766e]">
              {locale === "tr" ? "Ücretsiz hesap oluştur" : "Create a free account"}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}
