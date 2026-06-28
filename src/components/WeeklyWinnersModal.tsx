"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";

type WinnerRow = {
  userId: string;
  displayName: string;
  valueUsd: number;
  returnPercent: number;
  rank: number;
};

type WeeklyWinnersModalProps = {
  locale: Locale;
  isSignedIn: boolean;
  summary: {
    weekKey: string;
    weekLabel: string;
    publishedAtLabel: string;
    weeklyTop: WinnerRow[];
    totalTop: WinnerRow[];
    currentUserWeeklyRank: number | null;
    currentUserTotalRank: number | null;
    note?: string | null;
  };
};

function formatUsd(value: number, locale: Locale) {
  return new Intl.NumberFormat(locale === "en" ? "en-US" : "tr-TR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function RankingList({ title, rows, locale }: { title: string; rows: WinnerRow[]; locale: Locale }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="text-sm font-black uppercase tracking-[0.12em] text-[#0f766e]">{title}</h3>
      <div className="mt-3 grid gap-2">
        {rows.length === 0 ? (
          <p className="rounded-lg bg-white p-3 text-sm leading-6 text-slate-600">
            {locale === "tr" ? "Bu hafta listelenecek işlem bulunamadı." : "No qualifying trades were found for this week."}
          </p>
        ) : (
          rows.map((row) => (
            <div key={`${title}-${row.userId}`} className="grid grid-cols-[42px_1fr_auto] items-center gap-3 rounded-lg bg-white p-3 shadow-sm">
              <span className="text-xl font-black text-[#f5a623]">#{row.rank}</span>
              <span className="min-w-0 truncate text-sm font-black text-[#152033]">{row.displayName}</span>
              <span className={row.valueUsd >= 0 ? "text-sm font-black text-[#0f766e]" : "text-sm font-black text-red-600"}>
                {formatUsd(row.valueUsd, locale)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function WeeklyWinnersModal({ locale, isSignedIn, summary }: WeeklyWinnersModalProps) {
  const storageKey = `enbilir-weekly-winners-dismissed:${summary.weekKey}`;
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setIsOpen(window.localStorage.getItem(storageKey) !== "1");
    }, 0);

    return () => window.clearTimeout(handle);
  }, [storageKey]);

  function close() {
    window.localStorage.setItem(storageKey, "1");
    setIsOpen(false);
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/48 px-4 py-6 backdrop-blur-sm">
      <section className="relative max-h-[88vh] w-full max-w-4xl overflow-auto rounded-[1.25rem] border border-white/70 bg-white p-5 shadow-2xl sm:p-6">
        <button
          type="button"
          onClick={close}
          aria-label={locale === "tr" ? "Pencereyi kapat" : "Close window"}
          className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-white text-xl font-black text-slate-500 shadow-sm hover:border-[#0f766e] hover:text-[#0f766e]"
        >
          x
        </button>
        <p className="pr-12 text-xs font-black uppercase tracking-[0.16em] text-[#bd8c7d]">
          {locale === "tr" ? "Pazartesi 07.00 liderlik duyurusu" : "Monday 07:00 ranking update"}
        </p>
        <h2 className="mt-2 pr-12 text-2xl font-black text-[#152033]">
          {locale === "tr" ? "Geçen haftanın sanal portföy liderleri" : "Last week's virtual portfolio leaders"}
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
          {locale === "tr"
            ? `${summary.weekLabel} dönemi için iki liste yayınlandı. Haftalık liste geçen hafta yapılan sanal işlemlerin bugünkü fiyatlara göre katkısını, genel liste ise toplam portföy kârını gösterir. Yayın zamanı: ${summary.publishedAtLabel}.`
            : `Two lists are published for ${summary.weekLabel}. The weekly list shows the contribution of last week's virtual trades using current prices, while the overall list shows total portfolio profit. Published at: ${summary.publishedAtLabel}.`}
        </p>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <RankingList title={locale === "tr" ? "Haftanın en çok kazananları" : "Top weekly gainers"} rows={summary.weeklyTop} locale={locale} />
          <RankingList title={locale === "tr" ? "Toplamda en çok kazananlar" : "Top overall gainers"} rows={summary.totalTop} locale={locale} />
        </div>
        <div className="mt-4 rounded-xl border border-[#d1bfa7]/45 bg-[#fffaf6] p-4 text-sm font-bold leading-6 text-[#152033]">
          {!isSignedIn ? (
            locale === "tr"
              ? "Kendi haftalık ve genel sıranı görmek için hesabına giriş yapabilirsin."
              : "Sign in to see your own weekly and overall rank."
          ) : locale === "tr" ? (
            <>
              Senin haftalık sıran: <span className="font-black text-[#0f766e]">{summary.currentUserWeeklyRank ? `#${summary.currentUserWeeklyRank}` : "Bu hafta işlem yok"}</span>.
              {" "}Genel sıran: <span className="font-black text-[#0f766e]">{summary.currentUserTotalRank ? `#${summary.currentUserTotalRank}` : "Henüz sıralamada yok"}</span>.
            </>
          ) : (
            <>
              Your weekly rank: <span className="font-black text-[#0f766e]">{summary.currentUserWeeklyRank ? `#${summary.currentUserWeeklyRank}` : "No trade this week"}</span>.
              {" "}Your overall rank: <span className="font-black text-[#0f766e]">{summary.currentUserTotalRank ? `#${summary.currentUserTotalRank}` : "Not ranked yet"}</span>.
            </>
          )}
        </div>
        <a href={`/${locale}/haftalik-liderler`} className="mt-3 inline-flex rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-black text-[#152033] hover:border-[#0f766e] hover:text-[#0f766e]">
          {locale === "tr" ? "Haftalık liderler arşivini aç" : "Open weekly leaders archive"}
        </a>
        {summary.note ? <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{summary.note}</p> : null}
      </section>
    </div>
  );
}
