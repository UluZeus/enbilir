"use client";

import { useState } from "react";
import { getSafeLocale, type Locale } from "@/i18n/config";

type AiScenarioLabProps = {
  locale: Locale | string;
};

type ScenarioResponse = {
  answer?: string;
  error?: string;
  mode?: "openai" | "local";
  membership?: "STANDARD" | "VIP";
};

const copy = {
  tr: {
    kicker: "Senaryo modu",
    title: "Piyasayı tek etiketle değil, olası senaryolarla oku.",
    body: "Bu alan AI Robot'a daha doğru soru sorman için hazırlandı. Senaryolar yatırım tavsiyesi üretmez; portföy davranışını, risk yoğunlaşmasını ve piyasa okuryazarlığı sorularını daha anlaşılır hale getirir.",
    customLabel: "Kendi senaryonu yaz",
    placeholder: "Örn: Portföyümde kripto ağırlığı fazla olursa düşüşte neye bakmalıyım?",
    ask: "Senaryoyu çalıştır",
    thinking: "Senaryo okunuyor...",
    empty: "Bir senaryo seç veya kendi sorunu yaz.",
    failure: "Senaryo yanıtı hazırlanamadı.",
    result: "AI senaryo cevabı",
    mode: "Mod",
    cards: [
      {
        title: "BTC %8 düşerse neye bakılır?",
        prompt: "Bitcoin kısa sürede %8 düşerse, Enbilir site verisi ve piyasa okuryazarlığı açısından hangi göstergelere bakmalıyım? Bunu yatırım tavsiyesi vermeden, risk ve öğrenme diliyle açıkla.",
      },
      {
        title: "Altın-dolar-BIST dengesi",
        prompt: "Altın, dolar ve BIST aynı portföyde düşünülürse hangi risk dengeleri izlenmeli? Enbilir site verisiyle sınırlı, eğitim amaçlı bir senaryo analizi yap.",
      },
      {
        title: "Tek varlığa yoğunlaşma",
        prompt: "Sanal portföyde tek bir varlığa fazla ağırlık vermenin öğrenme açısından avantaj ve riskleri nelerdir? Bunu örneklerle açıkla.",
      },
      {
        title: "AI sinyali tersine dönerse",
        prompt: "AI ekranında olumlu görünen bir sinyal daha sonra zayıflarsa kullanıcı hangi soruları sormalı? Emir veya tavsiye vermeden karar kalitesi açısından anlat.",
      },
    ],
  },
  en: {
    kicker: "Scenario mode",
    title: "Read markets through possible scenarios, not a single label.",
    body: "This area helps you ask the AI Robot better questions. Scenarios do not produce investment advice; they make portfolio behavior, risk concentration, and market-literacy questions easier to understand.",
    customLabel: "Write your own scenario",
    placeholder: "Example: What should I watch if my portfolio is too concentrated in crypto?",
    ask: "Run scenario",
    thinking: "Reading scenario...",
    empty: "Choose a scenario or write your own question.",
    failure: "Scenario answer could not be prepared.",
    result: "AI scenario answer",
    mode: "Mode",
    cards: [
      {
        title: "If BTC drops 8%",
        prompt: "If Bitcoin drops 8% quickly, which indicators should I watch using Enbilir site data and market-literacy logic? Explain without investment advice.",
      },
      {
        title: "Gold-dollar-BIST balance",
        prompt: "If gold, the dollar, and BIST are considered in the same portfolio, what risk balances should be watched? Give an educational scenario read limited to Enbilir site data.",
      },
      {
        title: "Concentration in one asset",
        prompt: "What are the learning advantages and risks of putting too much virtual portfolio weight into one asset? Explain with examples.",
      },
      {
        title: "If an AI signal weakens",
        prompt: "If a signal that looked positive on the AI screen later weakens, what questions should the user ask? Explain in terms of decision quality without giving orders.",
      },
    ],
  },
} as const;

function paragraphs(value: string) {
  return value.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

export function AiScenarioLab({ locale }: AiScenarioLabProps) {
  const safeLocale = getSafeLocale(locale);
  const text = copy[safeLocale];
  const [scenario, setScenario] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [mode, setMode] = useState<ScenarioResponse["mode"] | null>(null);
  const [membership, setMembership] = useState<ScenarioResponse["membership"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function runScenario(nextScenario = scenario) {
    const cleanScenario = nextScenario.replace(/\s+/g, " ").trim();

    if (!cleanScenario || isLoading) {
      setError(text.empty);
      return;
    }

    setScenario(cleanScenario);
    setIsLoading(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await fetch("/api/ai-market/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          locale: safeLocale,
          message: cleanScenario,
          history: [],
        }),
      });
      const payload = await response.json() as ScenarioResponse;

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || text.failure);
      }

      setAnswer(payload.answer);
      setMode(payload.mode ?? null);
      setMembership(payload.membership ?? null);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : text.failure);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <details className="ai-scenario-lab group mx-auto mb-4 w-full max-w-[1600px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-4 py-3 marker:content-none md:px-5">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">{text.kicker}</p>
          <h2 className="mt-0.5 text-base font-bold text-[#152033] md:text-lg">{text.title}</h2>
        </div>
        <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-lg text-slate-600 transition group-open:rotate-45">+</span>
      </summary>
      <section className="border-t border-slate-200 bg-slate-50/70 p-4 md:p-5" aria-label={text.kicker}>
        <p className="max-w-4xl text-sm leading-6 text-slate-600">{text.body}</p>
        <div className="mt-4 flex flex-wrap gap-2">
            {text.cards.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => void runScenario(card.prompt)}
                disabled={isLoading}
                className="min-h-11 rounded-full border border-slate-200 bg-white px-4 py-2 text-left text-xs font-bold text-slate-700 shadow-sm transition hover:border-[#0f766e] hover:text-[#0f766e] disabled:cursor-wait disabled:opacity-60"
              >
                {card.title}
              </button>
            ))}
          </div>
        <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.8fr)]">
          <div className="grid content-start gap-3 rounded-xl border border-slate-200 bg-white p-3">
          <label className="grid gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
            {text.customLabel}
            <textarea
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
              rows={5}
              maxLength={700}
              placeholder={text.placeholder}
              className="min-h-24 resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium normal-case leading-6 tracking-normal text-slate-900 outline-none transition focus:border-[#0f766e] focus:ring-2 focus:ring-emerald-100"
            />
          </label>
          <button
            type="button"
            onClick={() => void runScenario()}
            disabled={isLoading}
            className="min-h-11 rounded-lg bg-[#0f766e] px-4 py-2.5 text-sm font-bold text-white transition hover:bg-[#0b5f59] disabled:cursor-wait disabled:opacity-60"
          >
            {isLoading ? text.thinking : text.ask}
          </button>
          {error ? <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">{error}</p> : null}
          </div>
          {answer ? (
            <article className="rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-live="polite">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-emerald-800">{text.result}</p>
                <span className="rounded-full border border-emerald-200 bg-white px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-emerald-800">
                  {text.mode}: {mode ?? "local"} {membership ? `· ${membership}` : ""}
                </span>
              </div>
              <div className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 text-sm leading-6 text-slate-700">
                {paragraphs(answer).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ) : (
            <div className="hidden rounded-xl border border-dashed border-slate-300 bg-white p-4 text-sm leading-6 text-slate-500 xl:block">
              {safeLocale === "tr" ? "Bir senaryo seçtiğinde sonuç bu alanda görünür." : "Choose a scenario to see its result here."}
            </div>
          )}
        </div>
      </section>
    </details>
  );
}
