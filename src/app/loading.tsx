export default function Loading() {
  return (
    <main className="grid min-h-screen place-items-center bg-[#101827] px-5 text-white">
      <section className="w-full max-w-md rounded-lg border border-[#f5a623]/40 bg-white/[0.04] p-8 text-center">
        <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#f5a623]/30 border-t-[#f5a623]" />
        <p className="mt-5 text-sm font-black uppercase tracking-[0.18em] text-[#f5a623]">Loading</p>
        <p className="mt-2 text-sm text-slate-300">Preparing Enbilir data.</p>
      </section>
    </main>
  );
}
