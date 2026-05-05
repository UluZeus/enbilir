import { PageHeader } from "@/components/PageHeader";
import { FormMessage } from "@/components/FormMessage";
import { getSafeLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { loginAction } from "@/lib/actions";

export default async function LoginPage({
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
      <PageHeader title={dictionary.pages.login.title} description={dictionary.pages.login.description} />
      <form action={loginAction} className="mx-auto grid w-full max-w-xl gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <FormMessage message={query.error} />
        <input type="hidden" name="locale" value={locale} />
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          E-posta
          <input name="email" type="email" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          Şifre
          <input name="password" type="password" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
        </label>
        <button className="rounded-md bg-[#101827] px-5 py-3 text-sm font-black text-white">Giriş yap</button>
      </form>
    </div>
  );
}
