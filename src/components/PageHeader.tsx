type PageHeaderProps = {
  title: string;
  description: string;
};

export function PageHeader({ title, description }: PageHeaderProps) {
  return (
    <section className="glass-card overflow-hidden rounded-lg shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1fr_340px]">
        <div className="p-8 sm:p-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-[#0f766e]">Enbilir</p>
          <h1 className="text-3xl font-black tracking-normal text-[#152033] sm:text-5xl">{title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">{description}</p>
        </div>
        <div className="premium-dark hidden p-8 text-white lg:block">
          <div className="grid h-full content-between gap-8">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#f5a623]">Platform</p>
              <p className="mt-3 text-2xl font-black">Piyasa, eğitim ve skor yönetimi</p>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <span className="rounded-md bg-white/10 p-3">Eğitim</span>
              <span className="rounded-md bg-white/10 p-3">Analiz</span>
              <span className="rounded-md bg-white/10 p-3">Liderlik</span>
              <span className="rounded-md bg-white/10 p-3">Panel</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
