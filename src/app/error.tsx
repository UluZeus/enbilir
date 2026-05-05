"use client";

import Link from "next/link";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center bg-[#101827] px-5 text-white">
      <section className="w-full max-w-xl rounded-lg border border-red-400/40 bg-white/[0.04] p-8 text-center shadow-2xl">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-red-300">Hata</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal">Bir şey ters gitti</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          İşlem tamamlanamadı. Sayfayı yeniden deneyebilir veya ana sayfaya dönebilirsin.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button onClick={reset} className="rounded-md bg-[#f5a623] px-5 py-3 text-sm font-black text-[#101827]">
            Tekrar dene
          </button>
          <Link href="/tr" className="rounded-md border border-[#f5a623] px-5 py-3 text-sm font-black text-[#f5a623]">
            Ana sayfa
          </Link>
        </div>
      </section>
    </main>
  );
}
