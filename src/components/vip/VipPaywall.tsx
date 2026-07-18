import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { formatTryAmount, membershipConfig } from "@/lib/membership";
import { submitVipPaymentClaimAction } from "@/lib/actions";

type LatestClaim = { status: string; providerReference: string; createdAt: Date } | null;

const inputClass = "rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15";

function Stepper({ locale, activeStep }: { locale: Locale; activeStep: number }) {
  const isEnglish = locale === "en";
  const steps = isEnglish
    ? ["Pay on Param", "Submit receipt", "Verification", "VIP access"]
    : ["Param’da öde", "Dekontu bildir", "Doğrulama", "VIP erişimi"];
  return (
    <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4" aria-label={isEnglish ? "VIP subscription steps" : "VIP abonelik adımları"}>
      {steps.map((step, index) => {
        const number = index + 1;
        const isActive = number === activeStep;
        const isPast = number < activeStep;
        return <li key={step} className={`relative rounded-2xl border p-3 ${isActive ? "border-[#e7c977] bg-[#e7c977]/12" : isPast ? "border-emerald-400/25 bg-emerald-400/8" : "border-white/10 bg-white/5"}`}><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isActive ? "bg-[#e7c977] text-[#07111f]" : isPast ? "bg-emerald-400 text-[#07111f]" : "bg-white/10 text-slate-300"}`}>{isPast ? "✓" : number}</span><p className={`mt-2 text-xs font-semibold ${isActive ? "text-[#f3dda0]" : "text-slate-300"}`}>{step}</p></li>;
      })}
    </ol>
  );
}

function ReportPreview({ locale }: { locale: Locale }) {
  const isEnglish = locale === "en";
  return (
    <section className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-white/5 p-5" aria-label={isEnglish ? "VIP report preview" : "VIP rapor önizlemesi"}>
      <div className="flex items-center justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#e7c977]">{isEnglish ? "Report preview" : "Rapor önizlemesi"}</p><h2 className="mt-1 text-lg font-bold text-white">{isEnglish ? "Institutional morning scorecard" : "Kurumsal sabah karnesi"}</h2></div><span className="rounded-full border border-white/15 bg-white/8 px-3 py-1 text-[10px] font-semibold text-slate-200">07:00</span></div>
      <div className="mt-5 space-y-3 select-none" aria-hidden="true"><div className="grid grid-cols-3 gap-2"><div className="h-16 rounded-xl bg-gradient-to-br from-emerald-400/18 to-white/5"/><div className="h-16 rounded-xl bg-gradient-to-br from-[#e7c977]/20 to-white/5"/><div className="h-16 rounded-xl bg-gradient-to-br from-rose-400/15 to-white/5"/></div><div className="h-3 w-3/4 rounded-full bg-white/12"/><div className="h-3 w-1/2 rounded-full bg-white/8"/><div className="grid grid-cols-4 gap-2 pt-2"><div className="h-10 rounded-lg bg-white/8"/><div className="h-10 rounded-lg bg-white/8"/><div className="h-10 rounded-lg bg-white/8"/><div className="h-10 rounded-lg bg-white/8"/></div></div>
      <div className="absolute inset-x-5 bottom-5 flex items-center justify-center rounded-xl border border-[#e7c977]/30 bg-[#07111f]/92 px-4 py-3 text-center text-xs font-semibold text-[#f3dda0] backdrop-blur">● {isEnglish ? "Unlock the full thesis, levels and source trail" : "Tam tez, seviyeler ve kaynak izi VIP ile açılır"}</div>
    </section>
  );
}

export function VipPaywall({ locale, isSignedIn, latestClaim }: { locale: Locale; isSignedIn: boolean; latestClaim?: LatestClaim }) {
  const isEnglish = locale === "en";
  const pending = latestClaim?.status === "PENDING";
  const activeStep = pending ? 3 : 1;
  const benefits = [
    isEnglish ? "FCF growth, leverage and margin expansion" : "FCF büyümesi, borçluluk ve marj genişlemesi",
    isEnglish ? "50/200-day averages and volume breakouts" : "50/200 günlük ortalama ve hacimli kırılım",
    isEnglish ? "RSI/MACD divergences and crowding filter" : "RSI/MACD uyumsuzluğu ve kalabalık filtresi",
    isEnglish ? "Entry, stop, targets and objective exit plan" : "Giriş, stop, hedefler ve objektif kaçış planı",
  ];

  return (
    <section className="overflow-hidden rounded-[2rem] border border-[#e7c977]/30 bg-[radial-gradient(circle_at_85%_8%,rgba(231,201,119,0.16),transparent_30%),linear-gradient(145deg,#07111f,#101d32)] text-white shadow-[0_34px_100px_rgba(2,8,23,0.28)]">
      <div className="grid gap-8 p-6 md:p-10 xl:grid-cols-[1.12fr_.88fr] xl:p-12">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#e7c977]/35 bg-[#e7c977]/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#f3dda0]">Enbilir VIP</span><span className="rounded-full border border-white/15 bg-white/8 px-3 py-1.5 text-[11px] font-semibold text-slate-200">{isEnglish ? "Daily · 07:00 Istanbul" : "Her gün · 07.00 İstanbul"}</span></div>
          <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.08] tracking-tight md:text-6xl">{isEnglish ? "Institutional research without the market noise" : "Piyasa gürültüsünü dışlayan kurumsal araştırma"}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">{isEnglish ? "Evidence-led asymmetric ideas, explicit invalidation levels and audited 1/3/6/12-month outcomes—delivered in one disciplined research desk." : "Kanıta dayalı asimetrik fikirler, net tez iptal seviyeleri ve denetlenebilir 1/3/6/12 aylık sonuçlar; tek ve disiplinli bir araştırma masasında."}</p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">{benefits.map((item) => <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/12 bg-white/7 px-4 py-4 text-sm font-medium leading-6 text-slate-100"><span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#e7c977] text-[11px] font-bold text-[#07111f]">✓</span>{item}</div>)}</div>
          <div className="mt-6"><ReportPreview locale={locale}/></div>
        </div>

        <aside className="self-start rounded-[1.75rem] border border-[#e7c977]/35 bg-[#0b1526]/95 p-5 shadow-2xl md:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#e7c977]">{isEnglish ? "Monthly VIP membership" : "Aylık VIP üyelik"}</p>
          <div className="mt-3 flex items-end gap-2"><p className="text-5xl font-bold tracking-tight text-white">{formatTryAmount(membershipConfig.vipMonthlyAmountTry)}</p><p className="pb-1.5 text-sm font-medium text-slate-300">/ {isEnglish ? "month" : "ay"}</p></div>
          <p className="mt-3 text-sm leading-6 text-slate-300">{isEnglish ? "Secure payment on Param. Access opens only after the receipt is verified against your Enbilir account." : "Param üzerinden güvenli ödeme. Erişim yalnız dekont Enbilir hesabınızla doğrulandıktan sonra açılır."}</p>
          <div className="mt-6"><Stepper locale={locale} activeStep={activeStep}/></div>

          {isSignedIn ? <>
            <a href={membershipConfig.vipPaymentLink} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#e7c977] px-5 py-3.5 text-sm font-semibold text-[#07111f] transition hover:bg-[#f3dda0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c977] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1526]">{isEnglish ? "Pay 100 TL securely on Param ↗" : "Param’da güvenle 100 TL öde ↗"}</a>
            {pending ? <div className="mt-4 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4" role="status"><div className="flex items-center gap-3"><span className="h-2.5 w-2.5 animate-pulse rounded-full bg-amber-300"/><strong className="text-sm text-amber-100">{isEnglish ? "Payment verification in progress" : "Ödeme doğrulaması sürüyor"}</strong></div><p className="mt-2 text-xs leading-5 text-slate-300">{isEnglish ? "Receipt" : "Dekont"}: <span className="font-semibold text-white">{latestClaim.providerReference}</span></p><p className="mt-1 text-xs leading-5 text-slate-400">{isEnglish ? "VIP access will open after an authorised review." : "Yetkili inceleme tamamlandığında VIP erişimi açılır."}</p></div> : <form action={submitVipPaymentClaimAction} className="mt-4 grid gap-4 rounded-2xl border border-white/12 bg-white/6 p-4"><input type="hidden" name="locale" value={locale}/><label className="grid gap-2 text-xs font-semibold text-slate-200">{isEnglish ? "Param receipt / transaction number" : "Param dekont / işlem numarası"}<input name="providerReference" required minLength={4} maxLength={100} autoComplete="off" placeholder={isEnglish ? "Enter the reference after payment" : "Ödeme sonrası referansı yazın"} className={inputClass}/></label><label className="grid gap-2 text-xs font-semibold text-slate-200">{isEnglish ? "Optional note" : "İsteğe bağlı not"}<input name="userNote" maxLength={500} className={inputClass}/></label><button className="rounded-xl border border-[#e7c977]/70 px-4 py-3 text-sm font-semibold text-[#f3dda0] transition hover:bg-[#e7c977] hover:text-[#07111f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c977] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1526]">{isEnglish ? "Submit receipt for verification" : "Dekontu doğrulamaya gönder"}</button></form>}
          </> : <Link href={`/${locale}/giris?returnTo=/${locale}/vip`} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#e7c977] px-5 py-3.5 text-sm font-semibold text-[#07111f] transition hover:bg-[#f3dda0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e7c977] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1526]">{isEnglish ? "Sign in to subscribe" : "Abonelik için giriş yap"}</Link>}

          <div className="mt-5 grid gap-2 border-t border-white/10 pt-5 text-xs leading-5 text-slate-400"><p>✓ {isEnglish ? "Param secure payment flow" : "Param güvenli ödeme akışı"}</p><p>✓ {isEnglish ? "Account-matched manual verification" : "Hesapla eşleşen yetkili doğrulama"}</p><p>✓ {isEnglish ? "No receipt number alone can grant access" : "Yalnız dekont numarası erişim sağlamaz"}</p></div>
        </aside>
      </div>
    </section>
  );
}
