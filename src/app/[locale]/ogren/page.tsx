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
    <div className="mx-auto grid max-w-5xl gap-6">
      <section className="premium-card p-6 sm:p-8">
        <p className="text-xs font-black uppercase text-[#0f766e]">{locale === "tr" ? "Tek öğrenme merkezi" : "One learning center"}</p>
        <h1 className="mt-2 text-3xl font-black text-[#152033] sm:text-4xl">{locale === "tr" ? "Ne öğrenmek istiyorsun?" : "What do you want to learn?"}</h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{locale === "tr" ? "Kılavuz, eğitim, rapor okuma ve AI kullanımını tek yerde topladık. İhtiyacın olan başlıktan devam et." : "Guide, education, report reading, and AI usage now live in one place. Continue from the topic you need."}</p>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {items.map((item) => (
          <Link key={item.href} href={`/${locale}/${item.href}`} className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#0f766e] hover:shadow-md">
            <p className="text-xs font-black uppercase text-[#8a6a5d]">{item.kicker}</p>
            <h2 className="mt-2 text-xl font-black text-[#152033] group-hover:text-[#0f766e]">{item.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{item.body}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}

function getItems(locale: "tr" | "en", signedIn: boolean) {
  if (locale === "en") return [
    { kicker: "Start", title: signedIn ? "Continue your personal path" : "How Enbilir works", body: signedIn ? "See your saved progress and best next step." : "Understand the complete platform journey before registering.", href: signedIn ? "baslangic" : "kullanim-kilavuzu" },
    { kicker: "Risk", title: "Know your decision style", body: "Use the risk appetite test to notice how you respond to uncertainty.", href: "risk-istahi-testi" },
    { kicker: "Market literacy", title: "Read markets with structure", body: "Build the foundations required before using indicators or reports.", href: "egitim" },
    { kicker: "AI tools", title: "Use AI with clear boundaries", body: "Learn the summary, terminal, chat, and what their outputs mean.", href: "ai-piyasa-asistani?tab=summary" },
    { kicker: "Reports", title: "Understand daily and weekly reports", body: "Learn to separate macro context, trend, risk, and technical evidence.", href: "ai-piyasa-asistani/raporlar" },
    { kicker: "Library", title: "Browse articles and guides", body: "Open the broader content library when you need deeper reading.", href: "icerik-merkezi" },
  ];
  return [
    { kicker: "Başlangıç", title: signedIn ? "Kişisel yoluna devam et" : "Enbilir nasıl kullanılır?", body: signedIn ? "Kaydedilmiş ilerlemeni ve sıradaki en doğru adımı gör." : "Kayıt olmadan önce platform yolculuğunun tamamını anla.", href: signedIn ? "baslangic" : "kullanim-kilavuzu" },
    { kicker: "Risk", title: "Karar tarzını tanı", body: "Belirsizliğe nasıl tepki verdiğini risk iştahı testiyle fark et.", href: "risk-istahi-testi" },
    { kicker: "Piyasa okuryazarlığı", title: "Piyasayı düzenli oku", body: "Gösterge veya rapor kullanmadan önce gereken temeli oluştur.", href: "egitim" },
    { kicker: "AI araçları", title: "AI'ı sınırlarıyla birlikte kullan", body: "Özet, terminal ve sohbetin ne anlattığını öğren.", href: "ai-piyasa-asistani?tab=summary" },
    { kicker: "Raporlar", title: "Günlük ve haftalık raporları anla", body: "Makro bağlam, trend, risk ve teknik kanıtı birbirinden ayırmayı öğren.", href: "ai-piyasa-asistani/raporlar" },
    { kicker: "Kütüphane", title: "Yazı ve kılavuzları incele", body: "Daha derin okuma gerektiğinde içerik kütüphanesini aç.", href: "icerik-merkezi" },
  ];
}
