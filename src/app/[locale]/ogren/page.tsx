import Link from "next/link";
import type { Metadata } from "next";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/ogren", page: "learn" });
}

export default async function LearnPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  const user = await getSessionUser();
  const items = getItems(locale, Boolean(user));

  return (
    <div className="learn-page-v3 mx-auto grid max-w-6xl gap-6">
      <section className="learn-hero-v3 p-6 sm:p-8 md:p-10">
        <p className="section-eyebrow-v3">{locale === "tr" ? "Tek öğrenme merkezi" : "One learning center"}</p>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold tracking-[-0.04em] text-slate-950 sm:text-5xl">{locale === "tr" ? "Bilgiyi ihtiyacın olan sırada keşfet." : "Discover knowledge in the order you need it."}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{locale === "tr" ? "Kılavuz, eğitim, rapor okuma ve AI kullanımını tek yerde topladık. Kısa bir başlık seç, ilerlemeni bölmeden devam et." : "Guide, education, report reading, and AI usage live in one place. Pick a short path and continue without losing momentum."}</p>
      </section>
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <Link key={item.href} href={`/${locale}/${item.href}`} className="learn-card-v3 group flex min-h-64 flex-col p-5 md:p-6">
            <div className="flex items-center justify-between gap-3">
              <span className="feature-icon-v3" aria-hidden="true"><LearnIcon name={item.icon} /></span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-600">{item.duration}</span>
            </div>
            <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.14em] text-teal-700">{item.kicker}</p>
            <h2 className="mt-2 text-xl font-bold leading-tight text-slate-950 group-hover:text-teal-800">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
            <span className="mt-auto pt-5 text-sm font-bold text-teal-700">{locale === "tr" ? "Başlığı aç" : "Open topic"} <span aria-hidden="true">→</span></span>
          </Link>
        ))}
      </section>
    </div>
  );
}

function getItems(locale: "tr" | "en", signedIn: boolean) {
  if (locale === "en") return [
    { icon: "path", duration: "4 min", kicker: "Start", title: signedIn ? "Continue your personal path" : "How Enbilir works", body: signedIn ? "See your saved progress and best next step." : "Understand the complete platform journey before registering.", href: signedIn ? "baslangic" : "kullanim-kilavuzu" },
    { icon: "risk", duration: "8 min", kicker: "Risk", title: "Know your decision style", body: "Use the risk appetite test to notice how you respond to uncertainty.", href: "risk-istahi-testi" },
    { icon: "academy", duration: "12 min", kicker: "Market literacy", title: "Read markets with structure", body: "Build the foundations required before using indicators or reports.", href: "egitim" },
    { icon: "ai", duration: "6 min", kicker: "AI tools", title: "Use AI with clear boundaries", body: "Learn the summary, terminal, chat, and what their outputs mean.", href: "ai-piyasa-asistani?tab=summary" },
    { icon: "report", duration: "7 min", kicker: "Reports", title: "Understand daily and weekly reports", body: "Learn to separate macro context, trend, risk, and technical evidence.", href: "ai-piyasa-asistani/raporlar" },
    { icon: "library", duration: "Explore", kicker: "Library", title: "Browse articles and guides", body: "Open the broader content library when you need deeper reading.", href: "icerik-merkezi" },
  ];
  return [
    { icon: "path", duration: "4 dk", kicker: "Başlangıç", title: signedIn ? "Kişisel yoluna devam et" : "Enbilir nasıl kullanılır?", body: signedIn ? "Kaydedilmiş ilerlemeni ve sıradaki en doğru adımı gör." : "Kayıt olmadan önce platform yolculuğunun tamamını anla.", href: signedIn ? "baslangic" : "kullanim-kilavuzu" },
    { icon: "risk", duration: "8 dk", kicker: "Risk", title: "Karar tarzını tanı", body: "Belirsizliğe nasıl tepki verdiğini risk iştahı testiyle fark et.", href: "risk-istahi-testi" },
    { icon: "academy", duration: "12 dk", kicker: "Piyasa okuryazarlığı", title: "Piyasayı düzenli oku", body: "Gösterge veya rapor kullanmadan önce gereken temeli oluştur.", href: "egitim" },
    { icon: "ai", duration: "6 dk", kicker: "AI araçları", title: "AI'ı sınırlarıyla birlikte kullan", body: "Özet, terminal ve sohbetin ne anlattığını öğren.", href: "ai-piyasa-asistani?tab=summary" },
    { icon: "report", duration: "7 dk", kicker: "Raporlar", title: "Günlük ve haftalık raporları anla", body: "Makro bağlam, trend, risk ve teknik kanıtı birbirinden ayırmayı öğren.", href: "ai-piyasa-asistani/raporlar" },
    { icon: "library", duration: "Keşfet", kicker: "Kütüphane", title: "Yazı ve kılavuzları incele", body: "Daha derin okuma gerektiğinde içerik kütüphanesini aç.", href: "icerik-merkezi" },
  ];
}

function LearnIcon({ name }: { name: string }) {
  if (name === "risk") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 3 4 6v6c0 4.8 3.2 7.5 8 9 4.8-1.5 8-4.2 8-9V6z" /><path d="M9 12h6" /></svg>;
  if (name === "academy") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="m3 9 9-5 9 5-9 5z" /><path d="M6 11v5c3 2 9 2 12 0v-5" /></svg>;
  if (name === "ai") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4" /><path d="M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2" /></svg>;
  if (name === "report") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 3h9l3 3v15H6z" /><path d="M9 11h6M9 15h6" /></svg>;
  if (name === "library") return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H11v18H7.5A3.5 3.5 0 0 0 4 23zM20 5.5A3.5 3.5 0 0 0 16.5 2H13v18h3.5A3.5 3.5 0 0 1 20 23z" /></svg>;
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="6" cy="18" r="2" /><circle cx="18" cy="6" r="2" /><path d="M8 18c5 0 2-10 8-11" /></svg>;
}
