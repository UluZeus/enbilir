import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#101827] px-5 text-white">
      <section className="w-full max-w-xl rounded-lg border border-[#f5a623]/40 bg-white/[0.04] p-8 text-center shadow-2xl">
        <p className="text-sm font-black uppercase tracking-[0.18em] text-[#f5a623]">404</p>
        <h1 className="mt-3 text-4xl font-black tracking-normal">Sayfa bulunamadı</h1>
        <p className="mt-4 text-sm leading-7 text-slate-300">
          Aradığın sayfa taşınmış, silinmiş veya hatalı bir bağlantı kullanılmış olabilir.
        </p>
        <Link href="/tr" className="mt-6 inline-flex rounded-md bg-[#f5a623] px-5 py-3 text-sm font-black text-[#101827]">
          Ana sayfaya dön
        </Link>
      </section>
    </main>
  );
}
