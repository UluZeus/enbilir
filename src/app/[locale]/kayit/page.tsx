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
    <div className="mx-auto grid max-w-3xl gap-6">
      <RegistrationStartTracker locale={locale} />
      <form action={registerAction} className="auth-conversion-form grid gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="border-b border-slate-100 pb-4">
          <p className="text-xs font-black uppercase text-[#8a6a5d]">
            {locale === "tr" ? "Bir dakikada hesap oluştur" : "Create your account in one minute"}
          </p>
          <h1 className="mt-2 text-2xl font-black text-[#152033]">
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
          className="rounded-md border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-[#152033] shadow-sm hover:border-[#0f766e] hover:text-[#0f766e]"
        >
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
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.fullName}
          <input name="name" required autoComplete="name" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.email}
          <input name="email" type="email" required autoComplete="email" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
        </label>
        <PasswordField
          label={copy.password}
          locale={locale}
          autoComplete="new-password"
          minLength={8}
          hint={locale === "tr" ? "En az 8 karakter kullan." : "Use at least 8 characters."}
        />

        <fieldset className="grid gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <legend className="px-1 text-sm font-black text-[#152033]">{locale === "tr" ? "Onaylar" : "Confirmations"}</legend>
          <label className="flex gap-3 text-sm text-slate-700"><input name="kvkkAccepted" type="checkbox" required /> <span><Link href={`/${locale}/kvkk`} className="font-bold text-[#0f766e]">{locale === "tr" ? "KVKK Aydınlatma Metni" : "Privacy Notice"}</Link>{locale === "tr" ? "’ni okudum." : " read and understood."}</span></label>
          <label className="flex gap-3 text-sm text-slate-700"><input name="termsAccepted" type="checkbox" required /> <span><Link href={`/${locale}/kullanim-sartlari`} className="font-bold text-[#0f766e]">{locale === "tr" ? "Kullanım Şartları" : "Terms of Use"}</Link>{locale === "tr" ? "’nı kabul ediyorum." : " accepted."}</span></label>
          <label className="flex gap-3 text-sm text-slate-700"><input name="noAdviceAccepted" type="checkbox" required /> <span>{copy.noAdviceAccepted}</span></label>
          <label className="flex gap-3 text-sm text-slate-700"><input name="electronicConsent" type="checkbox" /> <span>{copy.electronicConsent}</span></label>
        </fieldset>
        <button className="premium-cta px-5 py-3 text-sm font-black">{copy.register}</button>
        <p className="text-center text-sm text-slate-600">
          {locale === "tr" ? "Zaten hesabın var mı?" : "Already have an account?"}{" "}
          <Link href={`/${locale}/giris`} className="font-black text-[#0f766e]">{copy.login}</Link>
        </p>
      </form>
    </div>
  );
}
