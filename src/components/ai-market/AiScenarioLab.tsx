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
    <section className="ai-scenario-lab mx-auto mb-4 max-w-[1600px] rounded-[1.5rem] border border-cyan-300/16 bg-[#08111f] p-4 text-white shadow-2xl md:p-5">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#d1bfa7]">{text.kicker}</p>
          <h2 className="mt-2 max-w-4xl text-2xl font-black md:text-3xl">{text.title}</h2>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-300">{text.body}</p>
          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {text.cards.map((card) => (
              <button
                key={card.title}
                type="button"
                onClick={() => void runScenario(card.prompt)}
                disabled={isLoading}
                className="ai-scenario-card rounded-2xl border border-white/10 bg-white/7 p-4 text-left hover:border-cyan-300/40 disabled:cursor-wait disabled:opacity-60"
              >
                <p className="text-sm font-black text-white">{card.title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-300">{card.prompt}</p>
              </button>
            ))}
          </div>
        </div>

        <aside className="grid content-start gap-3 rounded-2xl border border-slate-800 bg-slate-950/50 p-4">
          <label className="grid gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-300">
            {text.customLabel}
            <textarea
              value={scenario}
              onChange={(event) => setScenario(event.target.value)}
              rows={5}
              maxLength={700}
              placeholder={text.placeholder}
              className="resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold normal-case leading-6 tracking-normal text-white outline-none focus:border-cyan-300"
            />
          </label>
          <button
            type="button"
            onClick={() => void runScenario()}
            disabled={isLoading}
            className="rounded-md border border-cyan-200 bg-cyan-100 px-4 py-3 text-sm font-black text-slate-950 hover:bg-white disabled:cursor-wait disabled:opacity-60"
          >
            {isLoading ? text.thinking : text.ask}
          </button>
          {error ? <p className="rounded-md border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs font-bold text-rose-100">{error}</p> : null}
          {answer ? (
            <article className="rounded-md border border-emerald-300/20 bg-emerald-300/10 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-[0.14em] text-emerald-100">{text.result}</p>
                <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-slate-200">
                  {text.mode}: {mode ?? "local"} {membership ? `· ${membership}` : ""}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-sm leading-6 text-slate-100">
                {paragraphs(answer).map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
