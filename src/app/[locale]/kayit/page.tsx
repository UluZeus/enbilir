import Link from "next/link";
import { FormMessage } from "@/components/FormMessage";
import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getUiCopy } from "@/i18n/ui-copy";
import { registerAction } from "@/lib/actions";

export default async function RegisterPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const dictionary = getDictionary(locale);
  const copy = getUiCopy(locale).auth;

  return (
    <div className="grid gap-6">
      <PageHeader title={dictionary.pages.register.title} description={dictionary.pages.register.description} locale={locale} />
      <form action={registerAction} className="mx-auto grid w-full max-w-2xl gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <FormMessage message={query.error} />
        <Link
          href={`/api/auth/google/start?locale=${locale}&returnTo=${encodeURIComponent(`/${locale}/panel`)}`}
          className="rounded-md border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-[#152033] shadow-sm hover:border-[#0f766e] hover:text-[#0f766e]"
        >
          {copy.google}
        </Link>
        <div className="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.12em] text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          {copy.or}
          <span className="h-px flex-1 bg-slate-200" />
        </div>
        <input type="hidden" name="locale" value={locale} />
        <label className="grid gap-2 text-sm font-bold text-slate-700">{copy.fullName}<input name="name" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">{copy.nickname}<input name="nickname" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">{copy.displayName}<select name="displayNameMode" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]"><option value="REAL_NAME">{copy.showRealName}</option><option value="NICKNAME">{copy.showNickname}</option></select></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">{copy.email}<input name="email" type="email" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">{copy.password}<input name="password" type="password" minLength={8} className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>
        <label className="flex gap-3 text-sm text-slate-700"><input name="kvkkAccepted" type="checkbox" /> <span><Link href={`/${locale}/kvkk`} className="font-bold text-[#0f766e]">{locale === "tr" ? "KVKK Aydınlatma Metni" : "Privacy Notice"}</Link>{locale === "tr" ? "’ni okudum." : " read and understood."}</span></label>
        <label className="flex gap-3 text-sm text-slate-700"><input name="termsAccepted" type="checkbox" /> <span><Link href={`/${locale}/kullanim-sartlari`} className="font-bold text-[#0f766e]">{locale === "tr" ? "Kullanım Şartları" : "Terms of Use"}</Link>{locale === "tr" ? "’nı kabul ediyorum." : " accepted."}</span></label>
        <label className="flex gap-3 text-sm text-slate-700"><input name="noAdviceAccepted" type="checkbox" /> <span>{copy.noAdviceAccepted}</span></label>
        <label className="flex gap-3 text-sm text-slate-700"><input name="electronicConsent" type="checkbox" /> <span>{copy.electronicConsent}</span></label>
        <button className="rounded-md bg-[#101827] px-5 py-3 text-sm font-black text-white">{copy.register}</button>
      </form>
    </div>
  );
}
