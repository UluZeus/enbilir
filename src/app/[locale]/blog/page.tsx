import { PageHeader } from "@/components/PageHeader";

export default function BlogPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="Blog" description="Finansal okuryazarlık yazıları ve platform duyuruları." />
      <section className="premium-card premium-card--interactive p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#152033]">İlk içerikler hazırlanıyor</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Blog alanı eğitim notları, yarışma duyuruları ve piyasa okuryazarlığı içerikleri için ayrıldı.</p>
      </section>
    </div>
  );
}
