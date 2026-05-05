import { PageHeader } from "@/components/PageHeader";

export default function ContactPage() {
  return (
    <div className="grid gap-6">
      <PageHeader title="İletişim" description="Destek, iş birliği ve hesap talepleri için iletişim kanalları." />
      <section className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-xl font-black text-[#152033]">WhatsApp destek</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">Soru ve talepler için WhatsApp üzerinden ulaşabilirsiniz.</p>
        <a href="https://wa.me/905322825555" target="_blank" rel="noreferrer" className="mt-5 inline-flex rounded-md bg-[#25d366] px-5 py-3 text-sm font-black text-white">
          WhatsApp ile yaz
        </a>
      </section>
    </div>
  );
}
