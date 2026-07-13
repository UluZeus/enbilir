"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Locale } from "@/i18n/config";
import type { OnboardingProgress, OnboardingStepId } from "@/lib/onboarding";

type GuidedHelpProps = {
  locale: Locale;
  userId?: string;
  progress?: Pick<OnboardingProgress, "steps" | "completedCount" | "totalCount" | "percent" | "nextStep">;
};

type HelpStep = {
  id: OnboardingStepId | "register";
  title: string;
  body: string;
  href: string;
  action: string;
};

export function GuidedHelp({ locale, userId, progress }: GuidedHelpProps) {
  const pathname = usePathname();
  const isSignedIn = Boolean(userId);
  const seenKey = `enbilir-guided-help:v3:${userId ?? "guest"}:${locale}`;
  const [isOpen, setIsOpen] = useState(false);
  const dialogId = useId();
  const titleId = useId();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const open = () => setIsOpen(true);
    window.addEventListener("enbilir:open-help", open);
    const isSelfGuidedPage = pathname === `/${locale}/kayit` || pathname === `/${locale}/giris` || pathname === `/${locale}/baslangic`;
    const frame = window.requestAnimationFrame(() => {
      if (!isSelfGuidedPage && window.localStorage.getItem(seenKey) !== "1") setIsOpen(true);
    });
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("enbilir:open-help", open);
    };
  }, [locale, pathname, seenKey]);

  useEffect(() => {
    if (!isOpen) return;

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      window.localStorage.setItem(seenKey, "1");
      setIsOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen, seenKey]);

  const steps = useMemo(() => getHelpSteps(locale, isSignedIn), [isSignedIn, locale]);
  const activeStep = isSignedIn
    ? steps.find((step) => step.id === progress?.nextStep) ?? steps[steps.length - 1]
    : steps[0];

  function closeHelp() {
    window.localStorage.setItem(seenKey, "1");
    setIsOpen(false);
  }

  return (
    <>
      {isOpen ? <div aria-hidden="true" onClick={closeHelp} className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-[1px]" /> : null}
    <div className="fixed inset-x-3 bottom-24 z-40 flex flex-col items-end gap-3 md:inset-x-auto md:bottom-5 md:right-5">
      {isOpen ? (
        <section id={dialogId} role="dialog" aria-modal="true" aria-labelledby={titleId} className="max-h-[calc(100dvh-7rem)] w-full overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl md:max-h-[calc(100dvh-2.5rem)] md:w-[390px]">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-[#101827] p-4 text-[#fffaf6]">
            <div>
              <p className="text-xs font-bold uppercase text-cyan-200">{locale === "tr" ? "Enbilir yardımcısı" : "Enbilir guide"}</p>
              <h2 id={titleId} className="mt-1 text-lg font-black text-[#fffaf6]">{locale === "tr" ? "Sıradaki en doğru adım" : "Your best next step"}</h2>
            </div>
            <button ref={closeButtonRef} type="button" onClick={closeHelp} aria-label={locale === "tr" ? "Yardımı kapat" : "Close help"} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-white/25 bg-white/10 text-lg font-black text-[#fffaf6]">x</button>
          </div>
          <div className="p-4">
            {isSignedIn && progress ? (
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs font-bold text-slate-600"><span>{locale === "tr" ? "Başlangıç ilerlemesi" : "Getting-started progress"}</span><span>{progress.completedCount}/{progress.totalCount}</span></div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-[#0f766e]" style={{ width: `${progress.percent}%` }} /></div>
              </div>
            ) : null}
            {activeStep ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black uppercase text-[#0f766e]">{locale === "tr" ? "Önerilen adım" : "Recommended step"}</p>
                <h3 className="mt-2 text-lg font-black text-[#152033]">{activeStep.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{activeStep.body}</p>
                {activeStep.id === "register" ? (
                  <Link href={activeStep.href} onClick={closeHelp} className="premium-cta mt-4 inline-flex w-full items-center justify-center px-4 py-3 text-sm font-black">{activeStep.action}</Link>
                ) : (
                  <Link href={activeStep.href} onClick={closeHelp} className="premium-cta mt-4 inline-flex w-full items-center justify-center px-4 py-3 text-sm font-black">{activeStep.action}</Link>
                )}
                {!isSignedIn ? <Link href={`/${locale}/giris`} onClick={closeHelp} className="mt-2 inline-flex w-full items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-black text-[#152033]">{locale === "tr" ? "Zaten üyeyim, giriş yap" : "I already have an account"}</Link> : null}
              </div>
            ) : null}
            {isSignedIn ? <Link href={`/${locale}/baslangic`} onClick={closeHelp} className="mt-3 inline-flex text-sm font-black text-[#0f766e]">{locale === "tr" ? "Tüm başlangıç adımlarını aç" : "Open all getting-started steps"}</Link> : null}
          </div>
        </section>
      ) : null}
      <button type="button" onClick={() => setIsOpen((current) => !current)} aria-expanded={isOpen} aria-controls={dialogId} className="hidden min-h-12 items-center gap-2 rounded-full border border-slate-700 bg-[#101827] px-4 py-3 text-sm font-black text-white shadow-xl hover:bg-[#0f766e] md:inline-flex">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-white/40" aria-hidden="true">?</span>{locale === "tr" ? "Yardım" : "Help"}
      </button>
    </div>
    </>
  );
}

function getHelpSteps(locale: Locale, signedIn: boolean): HelpStep[] {
  if (!signedIn) return [{ id: "register", title: locale === "tr" ? "Önce ücretsiz hesabını oluştur" : "Create your free account first", body: locale === "tr" ? "Yalnızca ad, e-posta ve şifrenle kaydol. Sonraki seçimlerde yardımcı yanında olacak." : "Register with only your name, email, and password. The guide will stay with you for the next choices.", href: `/${locale}/kayit`, action: locale === "tr" ? "Ücretsiz üye ol" : "Create free account" }];

  const tr = locale === "tr";
  return [
    { id: "league", title: tr ? "Öğrenme ligini seç" : "Choose your learning league", body: tr ? "Önce topluluğunu seç; sıralama daha sonra gelecek." : "Choose your community first; rankings come later.", href: `/${locale}/ligler`, action: tr ? "Ligleri aç" : "Open leagues" },
    { id: "risk", title: tr ? "Risk iştahını tanı" : "Understand your risk appetite", body: tr ? "İlk sanal işleminden önce karar eğilimlerini gör." : "See your decision tendencies before your first virtual trade.", href: `/${locale}/risk-istahi-testi`, action: tr ? "Risk testini başlat" : "Start risk test" },
    { id: "guide", title: tr ? "Kısa kullanım yolunu oku" : "Read the short usage path", body: tr ? "Araçların hangi sırayla kullanılacağını öğren." : "Learn the clearest order for using the tools.", href: `/${locale}/kullanim-kilavuzu`, action: tr ? "Kılavuzu aç" : "Open guide" },
    { id: "assistant", title: tr ? "AI araçlarını tanı" : "Meet the AI tools", body: tr ? "Özet ile başla, ayrıntı gerektiğinde terminale geç." : "Start with the summary and open the terminal when you need detail.", href: `/${locale}/ai-piyasa-asistani?tab=summary`, action: tr ? "AI rehberini aç" : "Open AI guide" },
    { id: "chat", title: tr ? "AI sohbete soru sor" : "Ask AI chat a question", body: tr ? "Kanıtı, riski ve alternatif senaryoyu sor." : "Ask about evidence, risk, and alternative scenarios.", href: `/${locale}/ai-piyasa-asistani?tab=chat`, action: tr ? "Sohbeti dene" : "Try chat" },
    { id: "trade", title: tr ? "İlk sanal işlemini yap" : "Place your first virtual trade", body: tr ? "Küçük başla ve karar gerekçeni yaz." : "Start small and write down your reason.", href: `/${locale}/islem-yap`, action: tr ? "Portföyü aç" : "Open portfolio" },
    { id: "reports", title: tr ? "Bir piyasa raporu oku" : "Read a market report", body: tr ? "Raporu talimat değil, bağlam olarak kullan." : "Use reports as context, not instructions.", href: `/${locale}/ai-piyasa-asistani/raporlar`, action: tr ? "Raporları aç" : "Open reports" },
    { id: "ranking", title: tr ? "En son liderliği incele" : "Review rankings last", body: tr ? "Önce sürecini anla, sonra istikrarını karşılaştır." : "Understand your process before comparing consistency.", href: `/${locale}/liderlik-tablosu`, action: tr ? "Liderliği aç" : "Open ranking" },
  ];
}
