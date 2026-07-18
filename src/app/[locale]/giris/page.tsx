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
import { getSafeLocaleReturnPath } from "@/lib/safe-navigation";

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
  searchParams?: Promise<{ error?: string; message?: string; returnTo?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const returnTo = getSafeLocaleReturnPath(query.returnTo, locale);
  const sessionUser = await getSessionUser();
  if (sessionUser) redirect(returnTo ?? `/${locale}/panel`);
  const dictionary = getDictionary(locale);
  const copy = getUiCopy(locale).auth;
  const isDevelopment = process.env.NODE_ENV !== "production";
  const loginReturnTo = returnTo ?? `/${locale}/baslangic`;
  const devLoginHref = `/api/auth/dev-login?locale=${locale}&returnTo=${encodeURIComponent(loginReturnTo)}`;

  return (
    <div className="auth-page-v3 grid gap-6">
      <section className="auth-layout-v3 mx-auto grid w-full max-w-5xl overflow-hidden lg:grid-cols-[0.9fr_1.1fr]">
        <div className="auth-story-v3 order-2 p-6 text-white sm:p-8 lg:order-1 lg:p-10">
          <p className="section-eyebrow-v3 section-eyebrow-v3--dark">
            {locale === "tr" ? "Geri dön ve ritmi yakala" : "Return and catch the rhythm"}
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.035em]">
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
              <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                <p className="text-sm font-bold text-white">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{body}</p>
              </div>
            ))}
          </div>
        </div>
        <form action={loginAction} className="auth-form-v3 order-1 grid w-full gap-4 bg-white p-6 sm:p-8 lg:order-2 lg:p-10">
          <div>
            <p className="section-eyebrow-v3">
              {locale === "tr" ? "Güvenli giriş" : "Secure sign in"}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-slate-950">{dictionary.pages.login.title}</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {locale === "tr" ? "Google ile hızlı giriş yapabilir veya e-posta hesabınla devam edebilirsin." : "Use Google for a fast sign-in or continue with your email account."}
            </p>
          </div>
          <FormMessage message={query.error ?? query.message} tone={query.message ? "success" : "error"} />
          <a
            href={`/api/auth/google/start?locale=${locale}&returnTo=${encodeURIComponent(loginReturnTo)}`}
            rel="nofollow"
            className="google-auth-button-v3 flex min-h-12 items-center justify-center gap-3 px-5 py-3 text-center text-sm font-semibold"
          >
            <GoogleIcon />
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
          <div className="flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
            <span className="h-px flex-1 bg-slate-200" />
            {copy.or}
            <span className="h-px flex-1 bg-slate-200" />
          </div>
          <input type="hidden" name="locale" value={locale} />
          <input type="hidden" name="returnTo" value={returnTo ?? ""} />
          <label className="grid gap-2 text-sm font-semibold text-slate-700">
            {copy.email}
            <input name="email" type="email" required autoComplete="email" className="auth-input-v3 px-4 py-3 font-normal" />
          </label>
          <PasswordField label={copy.password} locale={locale} autoComplete="current-password" />
          <button className="button-primary-v3 min-h-12 px-5 py-3 text-sm font-bold">{copy.login}</button>
          <p className="text-center text-sm text-slate-600">
            {locale === "tr" ? "Henüz hesabın yok mu?" : "No account yet?"}{" "}
            <Link href={`/${locale}/kayit`} className="font-bold text-teal-700">
              {locale === "tr" ? "Ücretsiz hesap oluştur" : "Create a free account"}
            </Link>
          </p>
        </form>
      </section>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
      <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.23-.2-1.77H12v3.4h5.52a4.74 4.74 0 0 1-2.05 3.02l-.02.11 2.98 2.31.21.02c1.93-1.78 2.96-4.4 2.96-7.09Z" />
      <path fill="#34A853" d="M12 22c2.7 0 4.97-.89 6.63-2.42l-3.17-2.45c-.85.57-1.98.97-3.46.97-2.6 0-4.8-1.75-5.59-4.18l-.1.01-3.1 2.4-.04.1A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.41 13.92A6.06 6.06 0 0 1 6.1 12c0-.67.11-1.32.3-1.92l-.01-.13-3.14-2.44-.1.05A10 10 0 0 0 2 12c0 1.6.38 3.12 1.17 4.44l3.24-2.52Z" />
      <path fill="#EA4335" d="M12 5.9c1.87 0 3.13.81 3.85 1.48l2.85-2.78C16.95 2.98 14.7 2 12 2a10 10 0 0 0-8.83 5.56l3.23 2.52C7.2 7.65 9.4 5.9 12 5.9Z" />
    </svg>
  );
}
