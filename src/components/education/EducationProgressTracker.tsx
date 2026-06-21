"use client";

import { useEffect, useMemo, useState } from "react";

type EducationProgressTrackerProps = {
  locale: "tr" | "en";
};

const steps = {
  tr: [
    "Temel kavramları oku",
    "Sanal portföy mantığını öğren",
    "Lig ve topluluk ritmini incele",
    "AI makro raporla değerlendirme yap",
  ],
  en: [
    "Read the core concepts",
    "Learn the virtual portfolio flow",
    "Review league and community rhythm",
    "Use an AI macro report for review",
  ],
};

export function EducationProgressTracker({ locale }: EducationProgressTrackerProps) {
  const storageKey = `enbilir-education-progress-${locale}`;
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const copy = steps[locale];

  useEffect(() => {
    try {
      const value = window.localStorage.getItem(storageKey);
      if (value) {
        queueMicrotask(() => setCompleted(JSON.parse(value) as Record<string, boolean>));
      }
    } catch {
      queueMicrotask(() => setCompleted({}));
    }
  }, [storageKey]);

  const percent = useMemo(() => {
    const done = copy.filter((step) => completed[step]).length;
    return Math.round((done / copy.length) * 100);
  }, [completed, copy]);

  function toggleStep(step: string) {
    setCompleted((current) => {
      const next = { ...current, [step]: !current[step] };
      window.localStorage.setItem(storageKey, JSON.stringify(next));
      return next;
    });
  }

  return (
    <section className="education-progress-card premium-card p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a6a5d]">
            {locale === "tr" ? "Eğitim ilerleme durumu" : "Learning progress"}
          </p>
          <h2 className="mt-2 text-2xl font-black text-[#152033]">
            {locale === "tr" ? "Tamamladığın adımları işaretle, ritmini görünür tut." : "Mark completed steps and keep your rhythm visible."}
          </h2>
        </div>
        <div className="rounded-2xl border border-[#d1bfa7]/45 bg-[#fffaf6] px-5 py-3 text-right">
          <p className="text-3xl font-black text-[#0f766e]">{percent}%</p>
          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#8a6a5d]">
            {locale === "tr" ? "Tamamlandı" : "Complete"}
          </p>
        </div>
      </div>
      <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#eee5dc]">
        <div className="h-full rounded-full bg-[#0f766e]" style={{ width: `${percent}%` }} />
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-4">
        {copy.map((step, index) => {
          const done = Boolean(completed[step]);

          return (
            <button
              key={step}
              type="button"
              onClick={() => toggleStep(step)}
              className={`rounded-2xl border p-4 text-left transition ${
                done
                  ? "border-[#0f766e]/35 bg-[#ecfdf5] text-[#152033]"
                  : "border-[#d1bfa7]/45 bg-white/75 text-[#152033] hover:border-[#bd8c7d]"
              }`}
            >
              <span className={`inline-flex rounded-full px-2 py-1 text-[11px] font-black uppercase tracking-[0.12em] ${
                done ? "bg-[#0f766e] text-white" : "bg-[#bd8c7d]/16 text-[#8a6a5d]"
              }`}>
                {done ? (locale === "tr" ? "Tamamlandı" : "Done") : `0${index + 1}`}
              </span>
              <p className="mt-3 text-sm font-black">{step}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}
