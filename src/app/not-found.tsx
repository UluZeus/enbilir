"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NotFound() {
  const pathname = usePathname();
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
  const isEnglish = locale === "en";

  return (
    <main className="error-state-v3 grid min-h-screen place-items-center px-5 py-12 text-white">
      <section className="error-card-v3 w-full max-w-2xl p-7 text-center sm:p-10">
        <span className="error-code-v3" aria-hidden="true">404</span>
        <p className="section-eyebrow-v3 section-eyebrow-v3--dark">{isEnglish ? "Page not found" : "Sayfa bulunamadı"}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">{isEnglish ? "This path does not lead anywhere yet." : "Bu yol henüz bir yere çıkmıyor."}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-300">
          {isEnglish ? "The page may have moved, been removed, or the address may contain a typo." : "Aradığın sayfa taşınmış, kaldırılmış veya bağlantıda küçük bir yazım hatası olabilir."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href={`/${locale}`} className="button-primary-v3 px-5 py-3 text-sm font-bold">{isEnglish ? "Return home" : "Ana sayfaya dön"}</Link>
          <Link href={`/${locale}/ogren`} className="button-secondary-dark-v3 px-5 py-3 text-sm font-semibold">{isEnglish ? "Explore learning" : "Öğrenmeyi keşfet"}</Link>
        </div>
      </section>
    </main>
  );
}
