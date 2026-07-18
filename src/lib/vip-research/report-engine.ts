import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import {
  calculateVipAsymmetryRank,
  calculateVipQuantitativeScore,
  hasRequiredVipResearchInputs,
  hasVipFundamentalVeto,
} from "@/lib/vip-research/candidate-policy";
import {
  fetchNasdaqFundamentals,
  fetchNasdaqInstitutional,
  fetchNasdaqShortInterest,
} from "@/lib/vip-research/nasdaq-research";
import {
  applyVipBuyEvidenceGate,
  getVerifiedCandidateSources,
  normalizeVipResearchSource,
} from "@/lib/vip-research/evidence-policy";
import { screenVipAssets } from "@/lib/vip-research/technical-screener";
import type {
  VipIdeaDraft,
  VipReportDraft,
  VipResearchCandidate,
  VipSource,
} from "@/lib/vip-research/types";

const DISCLAIMER = "Bu VIP araştırma raporu eğitim ve karar-destek amacıyla hazırlanır; kişiye özel yatırım danışmanlığı değildir. Veri gecikmesi, model hatası ve piyasa boşluğu riski vardır. Seviyeler garanti değil, önceden tanımlanmış risk disiplinidir.";
const METHODOLOGY_VERSION = "vip-asymmetric-v2-multi-asset-crowding";
const DEFAULT_MODEL = "gpt-5.6-terra";
const MAX_RESEARCH_CANDIDATES = 15;

type OpenAiResponse = {
  output_text?: string;
  output?: Array<{ type?: string; content?: Array<{ type?: string; text?: string; annotations?: Array<{ type?: string; url?: string; title?: string }> }> }>;
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function round(value: number, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function getIstanbulDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Istanbul",
  }).formatToParts(date);
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? "00";

  return `${value("year")}-${value("month")}-${value("day")}`;
}

async function enrichCandidates() {
  const screened = await screenVipAssets();
  const enriched = await Promise.all(
    screened.map(async (item): Promise<VipResearchCandidate> => {
      const [fundamental, institutional, shortInterest] = item.assetClass === "EQUITY"
        ? await Promise.all([
            fetchNasdaqFundamentals(item.symbol),
            fetchNasdaqInstitutional(item.symbol),
            fetchNasdaqShortInterest(item.symbol),
          ])
        : [null, null, null];
      const preliminary = {
        ...item,
        fundamental,
        institutional,
        shortInterest,
        quantitativeScore: 0,
      };

      return {
        ...preliminary,
        quantitativeScore: calculateVipQuantitativeScore(preliminary),
      };
    }),
  );

  const ranked = enriched
    .filter(hasRequiredVipResearchInputs)
    .sort((left, right) => right.quantitativeScore - left.quantitativeScore);
  const selected = new Map(ranked.slice(0, MAX_RESEARCH_CANDIDATES - 5).map((candidate) => [candidate.symbol, candidate]));

  for (const assetClass of ["BROAD_MARKET", "COMMODITY", "BOND", "FX", "CRYPTO"] as const) {
    const strongestInClass = ranked.find((candidate) => candidate.assetClass === assetClass);
    if (strongestInClass) selected.set(strongestInClass.symbol, strongestInClass);
  }

  for (const candidate of ranked) {
    if (selected.size >= MAX_RESEARCH_CANDIDATES) break;
    selected.set(candidate.symbol, candidate);
  }

  return Array.from(selected.values())
    .sort((left, right) => right.quantitativeScore - left.quantitativeScore)
    .slice(0, MAX_RESEARCH_CANDIDATES);
}

function outputText(payload: OpenAiResponse) {
  if (typeof payload.output_text === "string") {
    return payload.output_text;
  }

  return payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => content.text)
    .find((text): text is string => typeof text === "string");
}

function extractAnnotatedSources(payload: OpenAiResponse): VipSource[] {
  const sources = new Map<string, VipSource>();

  for (const content of payload.output?.flatMap((item) => item.content ?? []) ?? []) {
    for (const annotation of content.annotations ?? []) {
      if (annotation.type === "url_citation" && annotation.url?.startsWith("https://")) {
        sources.set(annotation.url, { title: annotation.title ?? new URL(annotation.url).hostname, url: annotation.url });
      }
    }
  }

  return Array.from(sources.values());
}

function promptFor(candidates: VipResearchCandidate[]) {
  return [
    "Rolün: milyarlarca dolarlık portföy yöneten, sosyal medya gürültüsünü dışlayan kıdemli bir hedge fon araştırma yöneticisi.",
    "Amaç: popülerlik değil, önümüzdeki 3-12 ay için asimetrik risk/getiri. En güçlü fırsat ilk sırada. Güçlü sayılar olsa bile tez kötüyse UZAK_DUR de.",
    "HİSSELER İÇİN ZORUNLU İKİ AYAK: (A) serbest nakit akışı büyümesi, gelir büyümesi, borç/varlık, borç/FCF, net marj ve marj genişlemesi; (B) günlük 50/200 ortalama, hacimli kırılım, RSI ve MACD uyumsuzluğu. Verilen hisse adayları bu temel veri kapısından geçmiştir; iki ayaktan birini gevşetme.",
    "HİSSE DIŞI VARLIKLAR: Şirket FCF, net marj, Ar-Ge veya kurumsal sahiplik verisi uydurma. A ayağını varlık türüne uygun makro/temel yapı ile kur: geniş piyasa için değerleme-kâr/faiz rejimi; emtia için arz-talep/stok/reel faiz; tahvil için getiri eğrisi-enflasyon-kredi spreadi; döviz için faiz farkı/merkez bankası/ödemeler dengesi; kripto için ağ kullanımı-likidite-regülasyon. B teknik ayağı aynen zorunludur.",
    "Katalizör araştırması: yalnızca gelecek 3-12 ayda devreye girebilecek yeni ürün, geri alım, kapasite/Ar-Ge yatırımı, regülasyon veya bilanço dönüm noktası. Her katalizörde somut olay ve takvim belirt; her fikrin sources alanına yalnızca o fikri destekleyen güvenli HTTPS kaynaklarını koy. Şirket IR/SEC gibi birincil kaynaklara öncelik ver.",
    "Kalabalık ve fiyatı şişmiş isimleri reddet. crowdingScore fiyatın 50/200 günlük ortalamalardan uzaklığı, RSI, 20/60 günlük momentum, 52 hafta zirvesi, hacim ve negatif uyumsuzluklardan hesaplanır. crowdingLevel HIGH ise ilave iskonto/giriş teyidi iste; EXTREME adaylar zaten filtrelenmiştir. Teknik veri fiyatın SMA50'den %18 veya SMA200'den %40 fazla uzaklaştığını gösteriyorsa AL deme. Kaynaksız kesin iddia kurma.",
    "Her fikirde olumsuz senaryo ve objektif kaçış planı zorunlu. Stop, giriş aralığı ve hedefler mevcut fiyat/ATR/destek-direnç ile tutarlı olmalı. Skorlar 1-100 arası tam sayı.",
    "En fazla 5 fikir seç; kaliteli fırsat yoksa daha az fikir döndür. Farklı varlık sınıflarını sırf çeşitlendirme için seçme; tüm sınıflar arasında risk ayarlı en güçlü asimetrik fırsatı ilk sıraya koy. Sadece verilen aday sembollerini kullan. Türkçe yaz. JSON dışında çıktı verme.",
    `Bugünün tarihi: ${new Date().toISOString()}.`,
    JSON.stringify({ candidates }),
  ].join("\n\n");
}

const reportSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    marketContext: { type: "string" },
    executiveSummary: { type: "string" },
    ideas: {
      type: "array",
      maxItems: 5,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          symbol: { type: "string" },
          stance: { type: "string", enum: ["AL", "TUT", "IZLE", "UZAK_DUR"] },
          thesisSummary: { type: "string" },
          negativeCase: { type: "string" },
          macroThesis: { type: "string" },
          fundamentalThesis: { type: "string" },
          technicalThesis: { type: "string" },
          catalysts: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 5 },
          exitPlan: { type: "string" },
          institutionalPerception: { type: "string" },
          shortInterestCommentary: { type: "string" },
          confidenceScore: { type: "integer", minimum: 1, maximum: 100 },
          riskScore: { type: "integer", minimum: 1, maximum: 100 },
          entryLow: { type: "number" },
          entryHigh: { type: "number" },
          stopLoss: { type: "number" },
          targetPrice: { type: "number" },
          secondaryTargetPrice: { type: ["number", "null"] },
          sources: {
            type: "array",
            minItems: 1,
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                title: { type: "string" },
                url: { type: "string" },
                publishedAt: { type: ["string", "null"] },
              },
              required: ["title", "url", "publishedAt"],
            },
          },
        },
        required: [
          "symbol", "stance", "thesisSummary", "negativeCase", "macroThesis", "fundamentalThesis", "technicalThesis",
          "catalysts", "exitPlan", "institutionalPerception", "shortInterestCommentary", "confidenceScore", "riskScore",
          "entryLow", "entryHigh", "stopLoss", "targetPrice", "secondaryTargetPrice", "sources",
        ],
      },
    },
  },
  required: ["marketContext", "executiveSummary", "ideas"],
} as const;

function isDraft(value: unknown): value is VipReportDraft {
  if (!value || typeof value !== "object") {
    return false;
  }

  const draft = value as Partial<VipReportDraft>;
  return typeof draft.marketContext === "string" && typeof draft.executiveSummary === "string" && Array.isArray(draft.ideas);
}

async function generateDraft(candidates: VipResearchCandidate[]) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey || candidates.length === 0) {
    return null;
  }

  const model = process.env.VIP_RESEARCH_MODEL ?? DEFAULT_MODEL;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      reasoning: { effort: "medium" },
      tools: [{ type: "web_search" }],
      include: ["web_search_call.action.sources"],
      input: promptFor(candidates),
      max_output_tokens: 12000,
      text: {
        format: {
          type: "json_schema",
          name: "enbilir_vip_asymmetric_report",
          strict: true,
          schema: reportSchema,
        },
      },
    }),
    signal: AbortSignal.timeout(180_000),
  });

  if (!response.ok) {
    throw new Error(`VIP OpenAI araştırması başarısız (${response.status}).`);
  }

  const payload = await response.json() as OpenAiResponse;
  const text = outputText(payload);

  if (!text) {
    throw new Error("VIP OpenAI araştırması boş döndü.");
  }

  const parsed = JSON.parse(text) as unknown;

  if (!isDraft(parsed)) {
    throw new Error("VIP OpenAI araştırması beklenen şemaya uymuyor.");
  }

  return { model, draft: parsed, payload, annotatedSources: extractAnnotatedSources(payload) };
}

function formatMetric(value: number | null, suffix = "%") {
  return value === null ? "veri yok" : `${round(value, 1)}${suffix}`;
}

function nonEquityFramework(candidate: VipResearchCandidate) {
  const labels = {
    BROAD_MARKET: "değerleme, şirket kâr döngüsü, faiz rejimi ve piyasa genişliği",
    COMMODITY: "fiziksel arz-talep, stoklar, üretim disiplini, dolar ve reel faiz",
    BOND: "getiri eğrisi, enflasyon beklentisi, vade primi ve kredi spreadi",
    FX: "faiz farkı, merkez bankası patikası, dış denge ve dolar likiditesi",
    CRYPTO: "ağ kullanımı, arz dinamiği, piyasa likiditesi ve regülasyon",
  } as const;

  return candidate.assetClass === "EQUITY" ? "kurumsal finansallar" : labels[candidate.assetClass];
}

function fallbackIdea(candidate: VipResearchCandidate): VipIdeaDraft {
  const technical = candidate.technical;
  const fundamental = candidate.fundamental;
  const atrAmount = technical.lastPrice * technical.atr14Pct / 100;
  const entryLow = Math.max(technical.support, technical.lastPrice - atrAmount * 0.65);
  const entryHigh = technical.lastPrice + atrAmount * 0.2;
  const stopLoss = Math.max(entryLow - atrAmount * 1.2, technical.support * 0.97);
  const minimumTarget = entryHigh + Math.max(entryLow - stopLoss, atrAmount) * 2;
  const firstTarget = Math.max(technical.resistance, minimumTarget);
  const fundamentalVeto = hasVipFundamentalVeto(candidate);
  const stance = !fundamentalVeto && !technical.crowdingVeto && candidate.quantitativeScore >= 72 && technical.distanceFromSma50Pct <= 14 ? "IZLE" : "UZAK_DUR";
  const fundamentalThesis = candidate.assetClass === "EQUITY" && fundamental
    ? `FCF büyümesi ${formatMetric(fundamental.freeCashFlowGrowthPct)}, gelir büyümesi ${formatMetric(fundamental.revenueGrowthPct)}, net marj ${formatMetric(fundamental.netMarginPct)}, marj değişimi ${formatMetric(fundamental.netMarginExpansionBps, " bp")}, borç/varlık ${formatMetric(fundamental.debtToAssetsPct)}.`
    : `${candidate.assetClass} için şirket FCF/net marj verisi uygulanamaz. Uygun A ayağı ${nonEquityFramework(candidate)} verileridir; canlı kaynak doğrulaması tamamlanmadığı için bu araç yalnız izleme/kaçınma statüsündedir.`;

  return {
    symbol: candidate.symbol,
    stance,
    thesisSummary: `${candidate.symbol}, iki ayaklı nicel kontrolde ${candidate.quantitativeScore}/100 aldı. Katalizörler kaynaklı web araştırmasıyla doğrulanamadığı için bu kayıt doğrudan AL değil, ${stance === "IZLE" ? "disiplinli izleme" : "kaçınma"} statüsündedir.`,
    negativeCase: "Katalizör doğrulaması yok; olumlu teknik ve temel görünüm tek başına yeniden fiyatlama garantisi vermez.",
    macroThesis: "Canlı makro araştırma üretilemedi. Faiz, dolar likiditesi ve sektör döngüsü teyidi olmadan pozisyon büyütülmemelidir.",
    fundamentalThesis,
    technicalThesis: `Fiyat ${technical.lastPrice}; SMA50 ${technical.sma50}, SMA200 ${technical.sma200}, RSI ${technical.rsi14}, hacim oranı ${technical.volumeRatio20d}x, 20/60 günlük momentum ${technical.momentum20dPct}%/${technical.momentum60dPct}%, RSI uyumsuzluğu ${technical.rsiDivergence}, MACD uyumsuzluğu ${technical.macdDivergence}, veri temelli crowding ${technical.crowdingScore}/100 (${technical.crowdingLevel}).`,
    catalysts: ["Kaynaklı katalizör araştırması yeniden çalıştırılmalı."],
    exitPlan: `Günlük kapanış ${round(stopLoss)} altına inerse tez iptal; ${round(firstTarget)} çevresinde hacim teyidi yoksa kâr/risk azaltımı değerlendirilmeli.`,
    institutionalPerception: candidate.assetClass === "EQUITY" ? candidate.institutional?.perception ?? "UNAVAILABLE" : "Bu varlık türünde tek şirket kurumsal sahiplik metriği uygulanamaz; fon akımı/pozisyonlanma ayrıca kaynaklanmalıdır.",
    shortInterestCommentary: candidate.assetClass === "EQUITY" ? `Short değişimi ${formatMetric(candidate.shortInterest?.changePercent ?? null)}, kapama süresi ${formatMetric(candidate.shortInterest?.daysToCover ?? null, " gün")}.` : "Tek şirket short-interest metriği uygulanamaz; vadeli pozisyonlanma veya ürün bazlı açık pozisyon kaynağı doğrulanmadan çıkarım yapılmadı.",
    confidenceScore: clamp(Math.round(candidate.quantitativeScore * 0.72), 1, 100),
    riskScore: clamp(Math.round(100 - candidate.quantitativeScore * 0.55 + technical.atr14Pct * 2), 1, 100),
    entryLow: round(entryLow),
    entryHigh: round(entryHigh),
    stopLoss: round(stopLoss),
    targetPrice: round(firstTarget),
    secondaryTargetPrice: round(firstTarget + (firstTarget - stopLoss) * 0.5),
    sources: [
      ...(fundamental ? [{ title: `${candidate.symbol} finansallar`, url: fundamental.sourceUrl }] : [{ title: `${candidate.symbol} tarihsel piyasa verisi`, url: candidate.marketDataSourceUrl }]),
      ...(candidate.institutional ? [{ title: `${candidate.symbol} kurumsal sahiplik`, url: candidate.institutional.sourceUrl }] : []),
      ...(candidate.shortInterest ? [{ title: `${candidate.symbol} short interest`, url: candidate.shortInterest.sourceUrl }] : []),
    ],
  };
}

function normalizeDraft(draft: VipReportDraft, candidates: VipResearchCandidate[], annotatedSources: VipSource[]) {
  const bySymbol = new Map(candidates.map((candidate) => [candidate.symbol, candidate]));
  const used = new Set<string>();
  const ideas = draft.ideas.flatMap((idea) => {
    const symbol = idea.symbol.trim().toUpperCase();
    const candidate = bySymbol.get(symbol);

    if (!candidate || used.has(symbol)) {
      return [];
    }

    used.add(symbol);
    const fallback = fallbackIdea(candidate);
    const verifiedAnnotatedSources = getVerifiedCandidateSources(annotatedSources, candidate);
    const sources = [...idea.sources, ...verifiedAnnotatedSources]
      .map(normalizeVipResearchSource)
      .filter((source): source is VipSource => source !== null);
    const uniqueSources = Array.from(new Map(sources.map((source) => [source.url, source])).values()).slice(0, 12);
    const entryLow = idea.entryLow > 0 ? idea.entryLow : fallback.entryLow;
    const entryHigh = idea.entryHigh >= entryLow ? idea.entryHigh : fallback.entryHigh;
    const stopLoss = idea.stopLoss > 0 && idea.stopLoss < entryLow ? idea.stopLoss : fallback.stopLoss;
    const minimumTarget = entryHigh + (entryLow - stopLoss) * 2;
    const targetPrice = idea.targetPrice >= minimumTarget ? idea.targetPrice : Math.max(fallback.targetPrice, minimumTarget);
    const fundamentalVeto = hasVipFundamentalVeto(candidate);
    const stretchedVeto = candidate.technical.distanceFromSma50Pct > 18 || candidate.technical.distanceFromSma200Pct > 40;
    const crowdingVeto = candidate.technical.crowdingVeto || candidate.technical.crowdingLevel === "EXTREME";
    const normalizedStance = applyVipBuyEvidenceGate({
      stance: idea.stance,
      riskVeto: fundamentalVeto || stretchedVeto || crowdingVeto,
      catalysts: idea.catalysts,
      // Model-authored URLs may be useful context, but only citations emitted by
      // the web-search response and matched to this candidate may authorize AL.
      sources: verifiedAnnotatedSources,
    });

    return [{
      ...idea,
      symbol,
      stance: normalizedStance,
      confidenceScore: clamp(Math.round(idea.confidenceScore), 1, 100),
      riskScore: clamp(Math.round(idea.riskScore), 1, 100),
      entryLow: round(entryLow),
      entryHigh: round(entryHigh),
      stopLoss: round(stopLoss),
      targetPrice: round(targetPrice),
      secondaryTargetPrice: idea.secondaryTargetPrice && idea.secondaryTargetPrice > targetPrice ? round(idea.secondaryTargetPrice) : fallback.secondaryTargetPrice,
      sources: uniqueSources.length > 0 ? uniqueSources : fallback.sources,
    }];
  });

  ideas.sort((left, right) => {
    const leftCandidate = bySymbol.get(left.symbol)!;
    const rightCandidate = bySymbol.get(right.symbol)!;
    const rankDifference = calculateVipAsymmetryRank(rightCandidate, right) - calculateVipAsymmetryRank(leftCandidate, left);

    return rankDifference || left.symbol.localeCompare(right.symbol);
  });

  return { ...draft, ideas };
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setUTCMonth(next.getUTCMonth() + months);
  return next;
}

export async function runVipResearchReport() {
  const periodKey = getIstanbulDateKey();
  const existing = await prisma.vipResearchReport.findUnique({
    where: { periodKey },
    select: { id: true, fallbackUsed: true },
  });

  if (existing) {
    return {
      reportId: existing.id,
      periodKey,
      schedulePeriodKey: periodKey,
      reused: true,
      sameDayRegeneration: false,
      emailSuppressed: false,
      fallbackUsed: existing.fallbackUsed,
    };
  }

  const candidates = await enrichCandidates();
  let model: string | null = null;
  let rawAiPayload: unknown = null;
  let fallbackUsed = false;
  let annotatedSources: VipSource[] = [];
  let draft: VipReportDraft;

  try {
    const generated = await generateDraft(candidates);

    if (!generated) {
      throw new Error("OpenAI anahtarı veya zorunlu temel veriye sahip aday bulunamadı.");
    }

    model = generated.model;
    rawAiPayload = generated.payload;
    annotatedSources = generated.annotatedSources;
    draft = normalizeDraft(generated.draft, candidates, annotatedSources);
  } catch (error) {
    fallbackUsed = true;
    rawAiPayload = { error: error instanceof Error ? error.message : "VIP araştırması üretilemedi." };
    draft = {
      marketContext: "Kaynaklı makro/katalizör araştırması bu çalıştırmada tamamlanamadı; rapor nicel veriyle sınırlı ve temkinli statüdedir.",
      executiveSummary: "Zorunlu temel ve teknik kapıdan geçen adaylar listelendi; katalizör doğrulaması olmadan AL notu üretilmedi.",
      ideas: candidates.slice(0, 5).map(fallbackIdea),
    };
  }

  const candidateBySymbol = new Map(candidates.map((candidate) => [candidate.symbol, candidate]));
  const generatedAt = new Date();
  let report: { id: string };

  try {
    report = await prisma.vipResearchReport.create({
      data: {
      periodKey,
      model,
      generatedAt,
      marketContext: draft.marketContext,
      executiveSummary: draft.executiveSummary,
      methodologyVersion: METHODOLOGY_VERSION,
      sourceSnapshot: candidates as unknown as Prisma.InputJsonValue,
      rawAiPayload: rawAiPayload as Prisma.InputJsonValue,
      fallbackUsed,
      disclaimer: DISCLAIMER,
      ideas: {
        create: draft.ideas.map((idea, index) => {
          const candidate = candidateBySymbol.get(idea.symbol)!;

          return {
            symbol: idea.symbol,
            providerSymbol: candidate.providerSymbol,
            displayName: candidate.displayName,
            assetClass: candidate.assetClass,
            currency: candidate.currency,
            rank: index + 1,
            stance: idea.stance,
            thesisSummary: idea.thesisSummary,
            negativeCase: idea.negativeCase,
            macroThesis: idea.macroThesis,
            fundamentalThesis: idea.fundamentalThesis,
            technicalThesis: idea.technicalThesis,
            catalysts: idea.catalysts as Prisma.InputJsonValue,
            exitPlan: idea.exitPlan,
            institutionalPerception: idea.institutionalPerception,
            shortInterestCommentary: idea.shortInterestCommentary,
            confidenceScore: idea.confidenceScore,
            riskScore: idea.riskScore,
            priceAtRecommendation: candidate.technical.lastPrice,
            entryLow: idea.entryLow,
            entryHigh: idea.entryHigh,
            stopLoss: idea.stopLoss,
            targetPrice: idea.targetPrice,
            secondaryTargetPrice: idea.secondaryTargetPrice,
            fundamentalSnapshot: candidate.fundamental
              ? candidate.fundamental as unknown as Prisma.InputJsonValue
              : Prisma.JsonNull,
            technicalSnapshot: candidate.technical as unknown as Prisma.InputJsonValue,
            institutionalSnapshot: candidate.institutional
              ? candidate.institutional as unknown as Prisma.InputJsonValue
              : Prisma.DbNull,
            shortInterestSnapshot: candidate.shortInterest
              ? candidate.shortInterest as unknown as Prisma.InputJsonValue
              : Prisma.DbNull,
            sources: idea.sources as unknown as Prisma.InputJsonValue,
            evaluations: {
              create: [
                { horizon: "1M", dueAt: addMonths(generatedAt, 1) },
                { horizon: "3M", dueAt: addMonths(generatedAt, 3) },
                { horizon: "6M", dueAt: addMonths(generatedAt, 6) },
                { horizon: "1Y", dueAt: addMonths(generatedAt, 12) },
              ],
            },
          };
        }),
      },
      },
      select: { id: true },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const concurrentReport = await prisma.vipResearchReport.findUnique({
        where: { periodKey },
        select: { id: true, fallbackUsed: true },
      });

      if (concurrentReport) {
        return {
          reportId: concurrentReport.id,
          periodKey,
          schedulePeriodKey: periodKey,
          reused: true,
          sameDayRegeneration: false,
          emailSuppressed: false,
          fallbackUsed: concurrentReport.fallbackUsed,
        };
      }
    }

    throw error;
  }

  return {
    reportId: report.id,
    periodKey,
    schedulePeriodKey: periodKey,
    reused: false,
    sameDayRegeneration: false,
    emailSuppressed: false,
    fallbackUsed,
    candidateCount: candidates.length,
    ideaCount: draft.ideas.length,
  };
}
