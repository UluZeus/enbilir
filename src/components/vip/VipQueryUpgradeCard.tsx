import type { Locale } from "@/i18n/config";
import { submitVipPaymentClaimAction } from "@/lib/actions";
import { membershipConfig } from "@/lib/membership";

type LatestClaim = {
  status: string;
  providerReference: string;
  createdAt: Date;
} | null;

const inputClass = "rounded-xl border border-amber-200 bg-white px-3.5 py-3 text-sm font-medium text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15";

export function VipQueryUpgradeCard({
  locale,
  latestClaim,
}: {
  locale: Locale;
  latestClaim: LatestClaim;
}) {
  const isEnglish = locale === "en";
  const pending = latestClaim?.status === "PENDING";

  return (
    <section id="ai-query-upgrade" className="scroll-mt-28 rounded-[1.5rem] border border-amber-300 bg-[linear-gradient(135deg,#fff9e8,#ffffff)] p-5 shadow-sm md:p-6">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,.75fr)] lg:items-start">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-800">{isEnglish ? "AI query allowance" : "AI sorgu hakkı"}</p>
          <h2 className="mt-2 text-2xl font-bold text-slate-950">{isEnglish ? "Raise your daily allowance from 5 to 15" : "Günlük sorgu hakkını 5'ten 15'e çıkar"}</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-700">
            {isEnglish
              ? "Full VIP content remains free during the launch promotion. The verified 100 TL monthly VIP payment adds 10 more AI queries per day. All allowances reset at 00:00 Istanbul time."
              : "Tanıtım döneminde tam VIP içerik erişimi ücretsiz devam eder. Doğrulanmış aylık 100 TL VIP ödemesi günlük AI hakkına 10 sorgu daha ekler. Tüm haklar İstanbul saatiyle 00.00'da sıfırlanır."}
          </p>
          <a href={membershipConfig.vipPaymentLink} target="_blank" rel="noreferrer" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-[#0b1526] px-5 py-3 text-sm font-bold text-[#f3dda0] transition hover:bg-slate-800">
            {isEnglish ? "Pay 100 TL securely on Param" : "Param'da güvenle 100 TL öde"} ↗
          </a>
        </div>

        {pending ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4" role="status">
            <p className="text-sm font-bold text-amber-950">{isEnglish ? "Payment verification is in progress" : "Ödeme doğrulaması sürüyor"}</p>
            <p className="mt-2 text-xs leading-5 text-amber-900">{isEnglish ? "Receipt" : "Dekont"}: <strong>{latestClaim.providerReference}</strong></p>
            <p className="mt-1 text-xs leading-5 text-amber-800">{isEnglish ? "Your daily allowance becomes 15 after approval." : "Onaydan sonra günlük sorgu hakkınız 15 olur."}</p>
          </div>
        ) : (
          <form action={submitVipPaymentClaimAction} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <input type="hidden" name="locale" value={locale} />
            <p className="text-sm font-bold text-slate-950">{isEnglish ? "After payment, submit your receipt" : "Ödeme sonrası dekontunu bildir"}</p>
            <label className="grid gap-2 text-xs font-semibold text-slate-700">
              {isEnglish ? "Param receipt / transaction number" : "Param dekont / işlem numarası"}
              <input name="providerReference" required minLength={4} maxLength={100} autoComplete="off" className={inputClass} />
            </label>
            <label className="grid gap-2 text-xs font-semibold text-slate-700">
              {isEnglish ? "Optional note" : "İsteğe bağlı not"}
              <input name="userNote" maxLength={500} className={inputClass} />
            </label>
            <button className="rounded-xl border border-amber-700 px-4 py-3 text-sm font-bold text-amber-900 transition hover:bg-amber-700 hover:text-white">
              {isEnglish ? "Submit receipt for verification" : "Dekontu doğrulamaya gönder"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
