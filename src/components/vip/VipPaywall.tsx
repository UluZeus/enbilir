import Link from "next/link";
import type { Locale } from "@/i18n/config";
import { formatTryAmount, membershipConfig } from "@/lib/membership";
import { submitVipPaymentClaimAction } from "@/lib/actions";

type LatestClaim = { status: string; providerReference: string; createdAt: Date } | null;

export function VipPaywall({ locale, isSignedIn, latestClaim }: { locale: Locale; isSignedIn: boolean; latestClaim?: LatestClaim }) {
  const isEnglish = locale === "en";

  return (
    <section className="overflow-hidden rounded-3xl border border-amber-300/40 bg-[#111827] text-white shadow-2xl">
      <div className="grid gap-8 p-7 md:grid-cols-[1.25fr_.75fr] md:p-10">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-300">Enbilir VIP</p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight md:text-5xl">
            {isEnglish ? "Institutional research without the market noise" : "Piyasa gürültüsünü dışlayan kurumsal araştırma"}
          </h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-slate-300">
            {isEnglish
              ? "Every morning at 07:00 Istanbul time: mandatory fundamental and institutional-technical gates, sourced catalysts, explicit invalidation levels, and audited 1/3/6/12-month performance."
              : "Her sabah 07.00'de zorunlu temel ve kurumsal-teknik kapı, kaynaklı katalizörler, net tez iptal seviyeleri ve denetlenebilir 1/3/6/12 aylık performans takibi."}
          </p>
          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            {[
              isEnglish ? "FCF growth, leverage, margin expansion" : "FCF büyümesi, borçluluk, marj genişlemesi",
              isEnglish ? "50/200-day averages and volume breakouts" : "50/200 günlük ortalama ve hacimli kırılım",
              isEnglish ? "RSI/MACD divergences and crowding filter" : "RSI/MACD uyumsuzluğu ve kalabalık filtre",
              isEnglish ? "Entry, stop, targets, and objective exit plan" : "Giriş, stop, hedef ve objektif kaçış planı",
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold text-slate-100">✓ {item}</div>
            ))}
          </div>
        </div>
        <aside className="rounded-3xl border border-amber-300/35 bg-gradient-to-b from-amber-300/15 to-white/5 p-6">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-300">{isEnglish ? "Monthly VIP" : "Aylık VIP"}</p>
          <p className="mt-3 text-4xl font-black">{formatTryAmount(membershipConfig.vipMonthlyAmountTry)}</p>
          <p className="mt-2 text-sm leading-6 text-slate-300">{isEnglish ? "Secure payment on Param. Access opens after payment verification." : "Param üzerinden güvenli ödeme. Ödeme doğrulamasından sonra erişim açılır."}</p>
          {isSignedIn ? (
            <>
              <a href={membershipConfig.vipPaymentLink} target="_blank" rel="noreferrer" className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950 hover:bg-amber-200">
                {isEnglish ? "1. Pay 100 TL on Param" : "1. Param'da 100 TL öde"}
              </a>
              {latestClaim?.status === "PENDING" ? (
                <div className="mt-4 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm leading-6 text-amber-100">
                  <strong>{isEnglish ? "Payment verification pending" : "Ödeme doğrulaması bekliyor"}</strong>
                  <span className="mt-1 block text-xs text-slate-300">{isEnglish ? "Receipt" : "Dekont"}: {latestClaim.providerReference}</span>
                </div>
              ) : (
                <form action={submitVipPaymentClaimAction} className="mt-4 grid gap-3 rounded-xl border border-white/10 bg-black/20 p-4">
                  <input type="hidden" name="locale" value={locale} />
                  <label className="grid gap-1 text-xs font-black text-slate-200">
                    {isEnglish ? "2. Param receipt / transaction number" : "2. Param dekont / işlem numarası"}
                    <input name="providerReference" required minLength={4} maxLength={100} autoComplete="off" className="rounded-lg border border-white/15 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none focus:border-amber-300" />
                  </label>
                  <label className="grid gap-1 text-xs font-black text-slate-200">
                    {isEnglish ? "Optional note" : "İsteğe bağlı not"}
                    <input name="userNote" maxLength={500} className="rounded-lg border border-white/15 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none focus:border-amber-300" />
                  </label>
                  <button className="rounded-lg border border-amber-300 px-4 py-2.5 text-sm font-black text-amber-300 hover:bg-amber-300 hover:text-slate-950">
                    {isEnglish ? "Submit payment for verification" : "Ödemeyi doğrulamaya gönder"}
                  </button>
                </form>
              )}
            </>
          ) : (
            <Link href={`/${locale}/giris?returnTo=/${locale}/vip`} className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-amber-300 px-5 py-3 font-black text-slate-950 hover:bg-amber-200">
              {isEnglish ? "Sign in to subscribe" : "Abonelik için giriş yap"}
            </Link>
          )}
          <p className="mt-4 text-xs leading-5 text-slate-400">{isEnglish ? "Use the same email as your Enbilir account. Access opens only after the Param receipt is verified; a receipt number alone never grants access." : "Ödemede Enbilir hesabınızdaki e-postayı kullanın. Erişim yalnız Param dekontu doğrulandıktan sonra açılır; yalnızca dekont numarası yazmak erişim sağlamaz."}</p>
        </aside>
      </div>
    </section>
  );
}
