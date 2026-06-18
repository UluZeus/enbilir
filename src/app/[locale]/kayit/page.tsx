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
  searchParams?: Promise<{ error?: string; message?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const dictionary = getDictionary(locale);
  const copy = getUiCopy(locale).auth;
  const isDevelopment = process.env.NODE_ENV !== "production";
  const devLoginHref = `/api/auth/dev-login?locale=${locale}&returnTo=${encodeURIComponent(`/${locale}/panel`)}`;
  const benefits = getRegisterBenefits(locale);
  const timeline = getRegisterTimeline(locale);

  return (
    <div className="grid gap-6">
      <PageHeader title={dictionary.pages.register.title} description={dictionary.pages.register.description} locale={locale} />
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="premium-card premium-card--dark p-6 sm:p-7">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#f5a623]">
            {locale === "tr" ? "Topluluk üyeliği" : "Community membership"}
          </p>
          <h2 className="mt-3 text-3xl font-black">
            {locale === "tr" ? "Rotary topluluğunu dijital yarışma ve eğitim akışına taşı." : "Bring your Rotary community into a digital competition and education flow."}
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-300">
            {locale === "tr"
              ? "Kayıt olan her üye; sanal portföy yarışmasına, AI destekli piyasa okuryazarlığına ve lig bazlı topluluk deneyimine aynı hesapla erişir."
              : "Each member who registers gets access to virtual portfolio competition, AI-supported market literacy, and league-based community participation from one account."}
          </p>
          <div className="mt-6 grid gap-3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="text-sm font-black text-white">{benefit.title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-300">{benefit.body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-200">
              {locale === "tr" ? "İlk 3 adım" : "First 3 steps"}
            </p>
            <div className="mt-3 grid gap-3">
              {timeline.map((step) => (
                <div key={step.title} className="flex gap-3">
                  <span className="mt-1 inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-xs font-black text-white">
                    {step.step}
                  </span>
                  <div>
                    <p className="text-sm font-black text-white">{step.title}</p>
                    <p className="mt-1 text-sm leading-6 text-slate-300">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <form action={registerAction} className="mx-auto grid w-full gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <FormMessage message={query.error ?? query.message} tone={query.message ? "success" : "error"} />
          <a
            href={`/api/auth/google/start?locale=${locale}&returnTo=${encodeURIComponent(`/${locale}/panel`)}`}
            className="rounded-md border border-slate-300 bg-white px-5 py-3 text-center text-sm font-black text-[#152033] shadow-sm hover:border-[#0f766e] hover:text-[#0f766e]"
          >
            {copy.googleRegister}
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
      </section>
    </div>
  );
}

function getRegisterBenefits(locale: string) {
  if (locale === "en") {
    return [
      {
        title: "Education plus competition",
        body: "Members can apply what they learn immediately inside a virtual portfolio, instead of stopping at static lessons.",
      },
      {
        title: "League-specific motivation",
        body: "Each Rotary community can build its own rhythm with rankings, invite-only participation, and shared progress.",
      },
      {
        title: "A modern AI companion",
        body: "The AI assistant turns raw market movement into readable learning cues and keeps the platform feeling alive.",
      },
    ] as const;
  }

  return [
    {
      title: "Eğitim ve yarışma birlikte",
      body: "Üyeler öğrendiklerini statik derslerde bırakmaz; doğrudan sanal portföy içinde uygular.",
    },
    {
      title: "Lige özel motivasyon",
      body: "Her Rotary topluluğu sıralama, davetli katılım ve ortak ilerleme üzerinden kendi ritmini kurabilir.",
    },
    {
      title: "Modern bir AI yardımcı",
      body: "AI asistanı ham piyasa hareketini okunabilir öğrenme sinyallerine dönüştürür ve platformu canlı hissettirir.",
    },
  ] as const;
}

function getRegisterTimeline(locale: string) {
  if (locale === "en") {
    return [
      {
        step: "1",
        title: "Create your profile",
        body: "Choose how you want to appear in rankings and community views.",
      },
      {
        step: "2",
        title: "Join or create a league",
        body: "Connect with your Rotary circle and make the experience social from day one.",
      },
      {
        step: "3",
        title: "Start learning with live context",
        body: "Use the AI assistant, education pages, and virtual trading flow as one connected journey.",
      },
    ] as const;
  }

  return [
    {
      step: "1",
      title: "Profilini oluştur",
      body: "Sıralama ve topluluk görünümünde nasıl yer almak istediğini belirle.",
    },
    {
      step: "2",
      title: "Bir lige katıl veya lig kur",
      body: "Rotary çevrenle bağ kur ve deneyimi ilk günden sosyal hale getir.",
    },
    {
      step: "3",
      title: "Canlı bağlamla öğrenmeye başla",
      body: "AI asistanı, eğitim sayfaları ve sanal işlem akışını tek bir öğrenme yolculuğu gibi kullan.",
    },
  ] as const;
}
