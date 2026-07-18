import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FormMessage } from "@/components/FormMessage";
import { PasswordField } from "@/components/PasswordField";
import { RegistrationStartTracker } from "@/components/RegistrationStartTracker";
import { getSafeLocale } from "@/i18n/config";
import { getUiCopy } from "@/i18n/ui-copy";
import { registerAction } from "@/lib/actions";
import { getSessionUser } from "@/lib/auth";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/kayit", page: "register" });
}

export default async function RegisterPage({
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
  const copy = getUiCopy(locale).auth;
  const isDevelopment = process.env.NODE_ENV !== "production";
  const startPath = `/${locale}/baslangic`;

  return (
    <div className="auth-page-v3 mx-auto grid max-w-5xl gap-6">
      <RegistrationStartTracker locale={locale} />
      <section className="auth-layout-v3 grid overflow-hidden lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="auth-story-v3 order-2 p-6 text-white sm:p-8 lg:order-1 lg:p-10">
          <p className="section-eyebrow-v3 section-eyebrow-v3--dark">{locale === "tr" ? "Ücretsiz ve yönlendirmeli" : "Free and guided"}</p>
          <h2 className="mt-4 text-3xl font-bold leading-tight tracking-[-0.035em]">{locale === "tr" ? "İlk kararından önce çalışma düzenini kur." : "Build your learning rhythm before your first decision."}</h2>
          <ol className="mt-6 grid gap-3">
            {(locale === "tr" ? ["Hesabını oluştur", "Risk profilini tanı", "Sanal portföyünü dene"] : ["Create your account", "Understand your risk profile", "Practice in your virtual portfolio"]).map((step, index) => (
              <li key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm font-semibold"><span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-300 text-xs font-bold text-slate-950">{index + 1}</span>{step}</li>
            ))}
          </ol>
          <p className="mt-6 text-xs leading-5 text-slate-400">{locale === "tr" ? "Gerçek para işlemi yoktur. Tüm portföy işlemleri eğitim amaçlı sanaldır." : "There are no real-money trades. All portfolio activity is virtual and educational."}</p>
        </aside>
      <form action={registerAction} className="auth-form-v3 order-1 grid gap-4 bg-white p-6 sm:p-8 lg:order-2 lg:p-10">
        <div className="border-b border-slate-100 pb-4">
          <p className="section-eyebrow-v3">
            {locale === "tr" ? "Bir dakikada hesap oluştur" : "Create your account in one minute"}
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-[-0.035em] text-slate-950">
            {locale === "tr" ? "Önce hesabın, sonra adım adım başlangıç" : "Your account first, then a guided start"}
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            {locale === "tr"
              ? "Lig, risk profili ve ilk sanal işlem seçimlerini kayıt sonrasında birlikte tamamlayacağız."
              : "We will guide you through league, risk profile, and your first virtual trade after registration."}
          </p>
        </div>

        <FormMessage message={query.error ?? query.message} tone={query.message ? "success" : "error"} />
        <a
          href={`/api/auth/google/start?locale=${locale}&returnTo=${encodeURIComponent(startPath)}`}
          rel="nofollow"
          className="google-auth-button-v3 flex min-h-12 items-center justify-center gap-3 px-5 py-3 text-center text-sm font-semibold"
        >
          <GoogleIcon />
          {copy.googleRegister}
        </a>
        {isDevelopment ? (
          <a
            href={`/api/auth/dev-login?locale=${locale}&returnTo=${encodeURIComponent(startPath)}`}
            className="rounded-md border border-dashed border-amber-300 bg-amber-50 px-5 py-3 text-center text-sm font-black text-amber-900"
          >
            {locale === "tr" ? "Geliştirme girişi" : "Development login"}
          </a>
        ) : null}
        <div className="flex items-center gap-3 text-xs font-bold uppercase text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          {copy.or}
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        <input type="hidden" name="locale" value={locale} />
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          {copy.fullName}
          <input name="name" required autoComplete="name" className="auth-input-v3 px-4 py-3 font-normal" />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-slate-700">
          {copy.email}
          <input name="email" type="email" required autoComplete="email" className="auth-input-v3 px-4 py-3 font-normal" />
        </label>
        <PasswordField
          label={copy.password}
          locale={locale}
          autoComplete="new-password"
          minLength={8}
          hint={locale === "tr" ? "En az 8 karakter kullan." : "Use at least 8 characters."}
        />

        <fieldset className="grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-bold text-slate-900">{locale === "tr" ? "Onaylar" : "Confirmations"}</legend>
          <label className="flex gap-3 text-sm text-slate-700"><input name="kvkkAccepted" type="checkbox" required /> <span><Link href={`/${locale}/kvkk`} className="font-bold text-[#0f766e]">{locale === "tr" ? "KVKK Aydınlatma Metni" : "Privacy Notice"}</Link>{locale === "tr" ? "’ni okudum." : " read and understood."}</span></label>
          <label className="flex gap-3 text-sm text-slate-700"><input name="termsAccepted" type="checkbox" required /> <span><Link href={`/${locale}/kullanim-sartlari`} className="font-bold text-[#0f766e]">{locale === "tr" ? "Kullanım Şartları" : "Terms of Use"}</Link>{locale === "tr" ? "’nı kabul ediyorum." : " accepted."}</span></label>
          <label className="flex gap-3 text-sm text-slate-700"><input name="noAdviceAccepted" type="checkbox" required /> <span>{copy.noAdviceAccepted}</span></label>
          <label className="flex gap-3 text-sm text-slate-700"><input name="electronicConsent" type="checkbox" /> <span>{copy.electronicConsent}</span></label>
        </fieldset>
        <button className="button-primary-v3 min-h-12 px-5 py-3 text-sm font-bold">{copy.register}</button>
        <p className="text-center text-sm text-slate-600">
          {locale === "tr" ? "Zaten hesabın var mı?" : "Already have an account?"}{" "}
          <Link href={`/${locale}/giris`} className="font-bold text-teal-700">{copy.login}</Link>
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
