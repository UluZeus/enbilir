import type { AgentAssetAnalysis } from "@/lib/ai-market/agent/analysis";
import type { AgentNewsItem } from "@/lib/ai-market/agent/news";
import { REQUIRED_MACRO_COVERAGE_LABELS } from "@/lib/ai-market/agent/macro-coverage";

export type AgentReportDraft = {
  macroSummary: string;
  marketRegime: string;
  riskAppetite: string;
  keyTakeaways: string[];
  newsSummary: string;
  assets: Array<{
    symbol: string;
    technicalCommentary: string;
    macroCommentary: string;
    newsCommentary: string;
    watchLevels: string[];
    scenarios: string[];
  }>;
};

const DEFAULT_MODEL = "gpt-4.1-mini";

function numberText(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? Number(value.toFixed(4)) : null;
}

function compactAsset(asset: AgentAssetAnalysis) {
  return {
    symbol: asset.symbol,
    displayName: asset.displayName,
    category: asset.category,
    required: asset.required,
    whyRequired: asset.whyRequired,
    error: asset.error,
    price: numberText(asset.analysis?.lastPrice),
    changePercent: numberText(asset.analysis?.changePercent),
    signal: asset.analysis?.signal.signal,
    confidence: asset.analysis?.signal.confidence,
    signalReasons: asset.analysis?.signal.reasons.slice(0, 4),
    riskLevel: asset.analysis?.risk.level,
    riskScore: asset.analysis?.risk.score,
    riskReasons: asset.analysis?.risk.reasons.slice(0, 4),
    rsi: numberText(asset.analysis?.indicators.rsi),
    ema20: numberText(asset.analysis?.indicators.ema20),
    ema50: numberText(asset.analysis?.indicators.ema50),
    ema200: numberText(asset.analysis?.indicators.ema200),
  };
}

function getPrompt(assets: AgentAssetAnalysis[], news: AgentNewsItem[]) {
  return [
    "Sen Enbilir icin calisan profesyonel bir piyasa arastirma ajanisin.",
    "Dil: Turkce. Uslup: net, ihtiyatli, egitici. Yatirim tavsiyesi verme.",
    "Gorev: Teknik veriler, haber basliklari ve makro konjonkturu birlikte yorumlayarak planli makro piyasa raporu uret.",
    "Sinyal dilini Turkcelestir: BUY yerine AL, STRONG_BUY yerine GUCLU AL, SELL yerine SAT, WATCH yerine IZLE, HOLD yerine BEKLE, AVOID yerine UZAK DUR, TAKE_PROFIT yerine KAR REALIZASYONU IZLE, NO_TRADE yerine ISLEM YOK yaz.",
    "macroSummary alani daha kapsamli olmali: yaklasik bir A4 sayfaya yakin, 500-700 kelime, 4-6 akici paragraf halinde makro konjonktur yorumu yaz.",
    "newsSummary alani 120-180 kelime olmali; haber akisini merkez bankalari, enerji, emtia, kur, ABD teknoloji hisseleri ve Asya piyasalari baglaminda toparla.",
    "Her varlik icin technicalCommentary, macroCommentary ve newsCommentary alanlarini kisa not gibi degil, 60-100 kelimelik egitici yorumlar halinde yaz.",
    `Zorunlu kapsam: ${REQUIRED_MACRO_COVERAGE_LABELS.join(", ")}.`,
    "Her zorunlu kapsam basligi raporda temsil edilmeli. Favori varliklar icin tek tek yorum yap.",
    "Cikti sadece JSON olsun. Markdown kullanma.",
    JSON.stringify({
      schema: {
        macroSummary: "string",
        marketRegime: "string",
        riskAppetite: "string",
        keyTakeaways: ["string"],
        newsSummary: "string",
        assets: [
          {
            symbol: "string",
            technicalCommentary: "string",
            macroCommentary: "string",
            newsCommentary: "string",
            watchLevels: ["string"],
            scenarios: ["string"],
          },
        ],
      },
      assets: assets.map(compactAsset),
      news: news.slice(0, 24),
    }),
  ].join("\n\n");
}

function parseOutputText(payload: unknown) {
  const response = payload as {
    output_text?: string;
    output?: Array<{ content?: Array<{ text?: string; type?: string }> }>;
  };

  if (typeof response.output_text === "string") {
    return response.output_text;
  }

  return response.output?.flatMap((item) => item.content ?? []).map((item) => item.text).find((text): text is string => typeof text === "string");
}

function isReportDraft(value: unknown): value is AgentReportDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Record<string, unknown>;

  return (
    typeof draft.macroSummary === "string" &&
    typeof draft.marketRegime === "string" &&
    typeof draft.riskAppetite === "string" &&
    Array.isArray(draft.keyTakeaways) &&
    typeof draft.newsSummary === "string" &&
    Array.isArray(draft.assets)
  );
}

export async function generateAiReportDraft(assets: AgentAssetAnalysis[], news: AgentNewsItem[]) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model = process.env.AI_MARKET_AGENT_MODEL ?? DEFAULT_MODEL;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      input: getPrompt(assets, news),
      temperature: 0.2,
      max_output_tokens: 9000,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI rapor cagrisi basarisiz oldu (${response.status}).`);
  }

  const payload = await response.json();
  const outputText = parseOutputText(payload);

  if (!outputText) {
    throw new Error("OpenAI raporu bos dondu.");
  }

  const parsed = JSON.parse(outputText) as unknown;

  if (!isReportDraft(parsed)) {
    throw new Error("OpenAI raporu beklenen JSON formatinda degil.");
  }

  return {
    model,
    draft: parsed,
    rawPayload: payload,
  };
}
