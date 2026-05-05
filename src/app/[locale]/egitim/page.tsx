import { PageHeader } from "@/components/PageHeader";

export default function EducationPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Eğitim" description="Finansal okuryazarlık ve sanal portföy yönetimi eğitim merkezi." />
      <section className="grid gap-4 md:grid-cols-3">
        {["Temel kavramlar", "Risk ve getiri", "Portföy disiplini"].map((title) => (
          <div key={title} className="premium-card premium-card--interactive p-6 shadow-sm">
            <h2 className="text-xl font-black text-[#152033]">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">Bu modül için ders içerikleri sonraki geliştirme adımlarında detaylandırılacak.</p>
          </div>
        ))}
      </section>
    </div>
  );
}
