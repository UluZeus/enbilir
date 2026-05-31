import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { FormMessage } from "@/components/FormMessage";
import { getSafeLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { getUiCopy } from "@/i18n/ui-copy";
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
  const copy = getUiCopy(locale).auth;

  return (
    <div className="grid gap-6">
      <PageHeader title={dictionary.pages.login.title} description={dictionary.pages.login.description} locale={locale} />
      <form action={loginAction} className="mx-auto grid w-full max-w-xl gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
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
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.email}
          <input name="email" type="email" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
        </label>
        <label className="grid gap-2 text-sm font-bold text-slate-700">
          {copy.password}
          <input name="password" type="password" className="rounded-md border border-slate-300 px-4 py-3 font-normal outline-none focus:border-[#0f766e]" />
        </label>
        <button className="rounded-md bg-[#101827] px-5 py-3 text-sm font-black text-white">{copy.login}</button>
      </form>
    </div>
  );
}
