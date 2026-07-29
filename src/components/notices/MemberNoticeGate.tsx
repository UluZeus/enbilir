"use client";

import { useEffect, useState } from "react";
import type { Locale } from "@/i18n/config";

export type MemberNoticeKind = "ONBOARDING" | "MONTHLY_SUPPORT";

export type MemberNoticeData = {
  kind: MemberNoticeKind;
  periodKey: string;
  paymentUrl: string | null;
};

type ClaimResponse = {
  ok: true;
  notice: MemberNoticeData | null;
};

const storageKeyPrefix = "enbilir:member-notice-entry";

export function getIstanbulPeriodKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Istanbul",
    year: "numeric",
    month: "2-digit",
  }).formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;

  return `${year}-${month}`;
}

export function getMemberNoticeEntryToken(
  storage: Pick<Storage, "getItem" | "setItem">,
  periodKey: string,
  createToken: () => string,
) {
  const storageKey = `${storageKeyPrefix}:${periodKey}`;
  const existingToken = storage.getItem(storageKey);

  if (existingToken) {
    return existingToken;
  }

  const token = createToken();
  storage.setItem(storageKey, token);
  return token;
}

export function getMemberNoticeCopy(locale: Locale, kind: MemberNoticeKind, paymentAvailable: boolean) {
  if (locale === "en") {
    return {
      eyebrow: kind === "ONBOARDING" ? "Welcome to Enbilir" : "A brief support reminder",
      title: kind === "ONBOARDING"
        ? "Welcome to Enbilir — your free access continues"
        : "Your free access continues this month",
      body: kind === "ONBOARDING"
        ? "AI analysis has a real operating cost. Enbilir keeps support voluntary: without paying, you retain full VIP content and 10 AI queries per day. An optional 100 TL monthly contribution raises the allowance to 15 queries per day and never renews automatically."
        : "Full VIP content and 10 daily AI queries remain free. If you wish, a voluntary 100 TL monthly contribution supports AI operating costs and raises your daily allowance to 15. It never renews automatically.",
      continueLabel: "Continue for free",
      supportLabel: "Support with 100 TL",
      suppressLabel: "Do not show again this month",
      closeLabel: "Close support notice",
      unavailable: paymentAvailable
        ? null
        : "Secure payment is temporarily unavailable. Your free access and daily allowance are unaffected.",
    };
  }

  return {
    eyebrow: kind === "ONBOARDING" ? "Enbilir’e hoş geldiniz" : "Kısa destek hatırlatması",
    title: kind === "ONBOARDING"
      ? "Enbilir’e hoş geldiniz — ücretsiz erişiminiz devam eder"
      : "Ücretsiz erişiminiz bu ay da devam eder",
    body: kind === "ONBOARDING"
      ? "AI analizlerinin gerçek bir işletim maliyeti vardır. Enbilir’de platform desteği gönüllüdür: ödeme yapmadan tam VIP içerik ve günlük 10 AI sorgu hakkınız sürer. İsteğe bağlı aylık 100 TL katkı günlük hakkı 15 sorguya çıkarır ve otomatik yenilenmez."
      : "Tam VIP içerik ve günlük 10 AI sorgu hakkınız ücretsiz devam eder. Dilerseniz aylık 100 TL gönüllü katkıyla AI işletim maliyetlerine destek olabilir ve günlük hakkınızı 15’e çıkarabilirsiniz. Katkı otomatik yenilenmez.",
    continueLabel: "Ücretsiz devam et",
    supportLabel: "100 TL ile destek ol",
    suppressLabel: "Bu ay tekrar gösterme",
    closeLabel: "Destek bildirimini kapat",
    unavailable: paymentAvailable
      ? null
      : "Güvenli ödeme şu anda kullanılamıyor. Ücretsiz erişiminiz ve günlük hakkınız etkilenmez.",
  };
}

export function MemberNotice({
  locale,
  notice,
  onClose,
  onSuppress,
}: {
  locale: Locale;
  notice: MemberNoticeData;
  onClose: () => void;
  onSuppress: () => void;
}) {
  const copy = getMemberNoticeCopy(locale, notice.kind, Boolean(notice.paymentUrl));

  return (
    <aside
      aria-label={copy.eyebrow}
      aria-live="polite"
      className="fixed inset-x-3 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-40 mx-auto max-w-3xl rounded-2xl border border-amber-300/60 bg-[#fffaf0] p-4 text-slate-950 shadow-[0_22px_70px_rgba(15,23,42,0.24)] sm:inset-x-6 md:bottom-6 md:p-5"
    >
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-800">{copy.eyebrow}</p>
          <h2 className="mt-1 text-lg font-black leading-6 text-slate-950">{copy.title}</h2>
          <p className="mt-2 text-sm font-medium leading-6 text-slate-700">{copy.body}</p>
          {copy.unavailable ? (
            <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-950">
              {copy.unavailable}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={copy.closeLabel}
          className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 bg-white text-xl font-bold text-slate-700 transition hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2"
        >
          <span aria-hidden="true">×</span>
        </button>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl bg-[#101827] px-4 py-3 text-sm font-black text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2"
        >
          {copy.continueLabel}
        </button>
        {notice.paymentUrl ? (
          <a
            href={notice.paymentUrl}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-xl border-2 border-amber-700 bg-white px-4 py-3 text-center text-sm font-black text-amber-900 transition hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
          >
            {copy.supportLabel}
            <span className="sr-only"> ({locale === "tr" ? "yeni sekmede açılır" : "opens in a new tab"})</span>
          </a>
        ) : null}
      </div>
      <button
        type="button"
        onClick={onSuppress}
        className="mt-3 min-h-11 rounded-lg px-2 py-2 text-sm font-bold text-slate-600 underline decoration-slate-400 underline-offset-4 transition hover:text-slate-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700 focus-visible:ring-offset-2"
      >
        {copy.suppressLabel}
      </button>
    </aside>
  );
}

export function MemberNoticeGate({ locale }: { locale: Locale }) {
  const [notice, setNotice] = useState<MemberNoticeData | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const periodKey = getIstanbulPeriodKey();
    let entryToken: string;

    try {
      entryToken = getMemberNoticeEntryToken(
        window.sessionStorage,
        periodKey,
        () => window.crypto.randomUUID(),
      );
    } catch {
      entryToken = window.crypto.randomUUID();
    }

    void fetch("/api/member-notices/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ entryToken }),
      signal: controller.signal,
    })
      .then(async (response) => {
        const payload = await response.json() as Partial<ClaimResponse>;

        if (response.ok && payload.ok === true) {
          setNotice(payload.notice ?? null);
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, []);

  if (!notice) {
    return null;
  }

  async function suppress() {
    if (!notice) {
      return;
    }

    const noticeToSuppress = notice;
    setNotice(null);

    try {
      await fetch("/api/member-notices/suppress", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ kind: noticeToSuppress.kind }),
      });
    } catch {
      // The notice remains dismissed for this hydrated view; the server can retry next entry.
    }
  }

  return (
    <MemberNotice
      locale={locale}
      notice={notice}
      onClose={() => setNotice(null)}
      onSuppress={() => void suppress()}
    />
  );
}
