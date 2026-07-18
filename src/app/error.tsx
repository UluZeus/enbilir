"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const pathname = usePathname();
  const locale = pathname === "/en" || pathname.startsWith("/en/") ? "en" : "tr";
  const isEnglish = locale === "en";

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="error-state-v3 grid min-h-[70vh] place-items-center px-5 py-12 text-white">
      <section className="error-card-v3 w-full max-w-2xl p-7 text-center sm:p-10">
        <span className="error-symbol-v3" aria-hidden="true">!</span>
        <p className="section-eyebrow-v3 section-eyebrow-v3--dark">{isEnglish ? "Temporary interruption" : "Geçici kesinti"}</p>
        <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">{isEnglish ? "We could not complete this page." : "Bu sayfayı tamamlayamadık."}</h1>
        <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-300">
          {isEnglish ? "Try fetching the page again. Your account and saved progress remain unchanged." : "Sayfayı yeniden getirmeyi deneyebilirsin. Hesabın ve kaydedilmiş ilerlemen değişmedi."}
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <button onClick={unstable_retry} className="button-primary-v3 px-5 py-3 text-sm font-bold">
            {isEnglish ? "Try again" : "Tekrar dene"}
          </button>
          <Link href={`/${locale}`} className="button-secondary-dark-v3 px-5 py-3 text-sm font-semibold">
            {isEnglish ? "Home" : "Ana sayfa"}
          </Link>
        </div>
        {error.digest ? <p className="mt-6 text-xs text-slate-500">{isEnglish ? "Reference" : "Referans"}: {error.digest}</p> : null}
      </section>
    </main>
  );
}
