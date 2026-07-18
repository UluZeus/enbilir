"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import "./globals.css";

export default function GlobalError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  const pathname = usePathname();
  const isEnglish = pathname === "/en" || pathname.startsWith("/en/");

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={isEnglish ? "en" : "tr"}>
      <body>
        <main className="error-state-v3 grid min-h-screen place-items-center px-5 py-12 text-white">
          <section className="error-card-v3 w-full max-w-2xl p-7 text-center sm:p-10">
            <span className="error-symbol-v3" aria-hidden="true">!</span>
            <p className="section-eyebrow-v3 section-eyebrow-v3--dark">{isEnglish ? "System interruption" : "Sistem kesintisi"}</p>
            <h1 className="mt-3 text-3xl font-bold tracking-[-0.04em] sm:text-5xl">{isEnglish ? "An unexpected error occurred." : "Beklenmeyen bir hata oluştu."}</h1>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-300">{isEnglish ? "Try loading the application again. If the issue continues, please return later." : "Uygulamayı yeniden yüklemeyi dene. Sorun sürerse kısa bir süre sonra tekrar gelebilirsin."}</p>
            <button onClick={unstable_retry} className="button-primary-v3 mt-7 px-5 py-3 text-sm font-bold">
              {isEnglish ? "Reload application" : "Uygulamayı yeniden yükle"}
            </button>
            {error.digest ? <p className="mt-6 text-xs text-slate-500">{isEnglish ? "Reference" : "Referans"}: {error.digest}</p> : null}
          </section>
        </main>
      </body>
    </html>
  );
}
