import Link from "next/link";
import { FormMessage } from "@/components/FormMessage";
import { PageHeader } from "@/components/PageHeader";
import { getSafeLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
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

  return (
    <div className="grid gap-6">
      <PageHeader title={dictionary.pages.register.title} description={dictionary.pages.register.description} />
      <form action={registerAction} className="mx-auto grid w-full max-w-2xl gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <FormMessage message={query.error} />
        <input type="hidden" name="locale" value={locale} />
        <label className="grid gap-2 text-sm font-bold text-slate-700">Ad soyad<input name="name" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Rumuz<input name="nickname" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Görünen ad<select name="displayNameMode" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]"><option value="REAL_NAME">Adımla görünsün</option><option value="NICKNAME">Rumuzumla görünsün</option></select></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">E-posta<input name="email" type="email" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">Şifre<input name="password" type="password" minLength={8} className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" /></label>
        <label className="flex gap-3 text-sm text-slate-700"><input name="kvkkAccepted" type="checkbox" /> <span><Link href={`/${locale}/kvkk`} className="font-bold text-[#0f766e]">KVKK Aydınlatma Metni</Link>’ni okudum.</span></label>
        <label className="flex gap-3 text-sm text-slate-700"><input name="termsAccepted" type="checkbox" /> <span><Link href={`/${locale}/kullanim-sartlari`} className="font-bold text-[#0f766e]">Kullanım Şartları</Link>’nı kabul ediyorum.</span></label>
        <label className="flex gap-3 text-sm text-slate-700"><input name="noAdviceAccepted" type="checkbox" /> <span>Platformun yatırım tavsiyesi vermediğini kabul ediyorum.</span></label>
        <label className="flex gap-3 text-sm text-slate-700"><input name="electronicConsent" type="checkbox" /> <span>Elektronik ileti almak istiyorum.</span></label>
        <button className="rounded-md bg-[#101827] px-5 py-3 text-sm font-black text-white">Kayıt ol</button>
      </form>
    </div>
  );
}
