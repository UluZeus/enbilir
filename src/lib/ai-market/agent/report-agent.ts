import { AI_MARKET_AGENT_INTERVAL, analyzeAgentAssets, type AgentAssetAnalysis } from "@/lib/ai-market/agent/analysis";
import { generateAiReportDraft, type AgentReportDraft } from "@/lib/ai-market/agent/llm";
import { REQUIRED_MACRO_COVERAGE_LABELS } from "@/lib/ai-market/agent/macro-coverage";
import { collectAgentNews, type AgentNewsItem } from "@/lib/ai-market/agent/news";
import { DEFAULT_AI_MARKET_FAVORITES } from "@/lib/ai-market/favorite-defaults";
import { getUserFavoriteSymbols } from "@/lib/ai-market/favorites";
import { AI_MARKET_DISCLAIMER } from "@/lib/ai-market/explanation-engine";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";

export type RunAiMarketAgentOptions = {
  userId?: string | null;
  force?: boolean;
};

function getPeriodKey(date = new Date()) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");

  return `${year}-${month}-${day}T${hour}:00Z`;
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "degisim verisi yok";
  }

  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getSignalLabel(signal: string | null | undefined) {
  const labels: Record<string, string> = {
    STRONG_BUY: "GUCLU AL",
    BUY: "AL",
    WATCH: "IZLE",
    HOLD: "BEKLE",
    TAKE_PROFIT: "KAR REALIZASYONU IZLE",
    SELL: "SAT",
    AVOID: "UZAK DUR",
    NO_TRADE: "ISLEM YOK",
  };

  return signal ? labels[signal] ?? signal : "ISLEM YOK";
}

function localizeSignalText(value: string) {
  return value
    .replace(/\bSTRONG_BUY\b/g, "GUCLU AL")
    .replace(/\bTAKE_PROFIT\b/g, "KAR REALIZASYONU IZLE")
    .replace(/\bNO_TRADE\b/g, "ISLEM YOK")
    .replace(/\bBUY\b/g, "AL")
    .replace(/\bSELL\b/g, "SAT")
    .replace(/\bWATCH\b/g, "IZLE")
    .replace(/\bHOLD\b/g, "BEKLE")
    .replace(/\bAVOID\b/g, "UZAK DUR");
}

function expandMacroSummary(summary: string, assets: AgentAssetAnalysis[], news: AgentNewsItem[]) {
  const wordCount = summary.split(/\s+/).filter(Boolean).length;

  if (wordCount >= 450) {
    return summary;
  }

  const topMovers = getTopMovers(assets);
  const moverText =
    topMovers.length > 0
      ? `Son teknik kesitte one cikan hareketler ${topMovers.map((asset) => `${asset.displayName} ${formatPercent(asset.analysis?.changePercent)}`).join(", ")} olarak izleniyor.`
      : "Son teknik kesitte belirgin bir hareket ayrismasi sinirli kaliyor.";
  const newsText = news.slice(0, 3).map((item) => `${item.source} kaynakli ${item.category} basligi`).join(", ");

  return [
    summary,
    moverText,
    "Bu raporda altin, gumus, paladyum ve Brent petrol emtia enflasyonu, sanayi talebi ve guvenli liman davranisi icin birlikte okunmaktadir. Dolar/TL, euro/TL ve euro/dolar paritesi kur geciskenligi, global dolar likiditesi ve yerel fiyatlama davranisi acisindan ana referans noktalaridir. BIST 100, Dow Jones ve Nasdaq ise yerel ve kuresel risk istahinin farkli katmanlarini gosterir; Dow Jones daha genis ekonomik donguye, Nasdaq ise buyume, yariletken ve yapay zeka temalarina daha hassas tepki verir.",
    "Enerji hisseleri petrol ve dogalgaz maliyetleriyle, nukleer enerji hisseleri uzun vadeli enerji guvenligi ve altyapi yatirimlariyla, yapay zeka hisseleri ise sermaye piyasalarindaki buyume istahi ve teknoloji carpanlariyla birlikte degerlendirilmelidir. Cin, Japonya ve Uzak Dogu endeksleri kuresel tedarik zinciri, ihracat talebi, yari iletken akisi ve Asya kaynakli risklerin erken sinyali olabilir. Bu nedenle rapordaki teknik gostergeler yalnizca fiyat grafigi degil, daha genis sermaye akimi ve haber rejiminin bir parcasi olarak okunmalidir.",
    `Haber tarafinda ${newsText || "ana makro haber basliklari"} takip edilmektedir. Haber akisi kuvvetliyse AL veya SAT sinyalleri daha hizli teyit ya da iptal gorebilir; haber akisi zayifsa hacim, RSI, MACD, Ichimoku ve trend davranisi daha belirleyici hale gelir. Tek bir varliktaki sinyal, karar almak icin yeterli degildir; portfoy riski, vade, likidite, haber akisi ve makro rejim birlikte ele alinmalidir. Bu raporun ana amaci yonlendirmek degil, piyasanin hangi basliklar etrafinda dusunulmesi gerektigini sistemli bicimde gostermektir.`,
  ].join(" ");
}

function getTopMovers(assets: AgentAssetAnalysis[]) {
  return assets
    .filter((asset) => typeof asset.analysis?.changePercent === "number")
    .sort((left, right) => Math.abs(right.analysis?.changePercent ?? 0) - Math.abs(left.analysis?.changePercent ?? 0))
    .slice(0, 5);
}

function buildFallbackDraft(assets: AgentAssetAnalysis[], news: AgentNewsItem[]): AgentReportDraft {
  const successful = assets.filter((asset) => asset.analysis);
  const topMovers = getTopMovers(successful);
  const riskScores = successful.map((asset) => asset.analysis?.risk.score ?? 0);
  const averageRisk = riskScores.length > 0 ? riskScores.reduce((total, score) => total + score, 0) / riskScores.length : 50;
  const bullishCount = successful.filter((asset) => ["BUY", "STRONG_BUY"].includes(asset.analysis?.signal.signal ?? "")).length;
  const bearishCount = successful.filter((asset) => ["SELL", "AVOID"].includes(asset.analysis?.signal.signal ?? "")).length;

  return {
    macroSummary: [
      "Planli makro ajan raporu teknik gostergeler, haber akisi ve zorunlu makro varlik sepetiyle olusturuldu. Kuresel piyasalarda ana belirleyici basliklar merkez bankalarinin faiz patikasi, dolar likiditesi, enerji fiyatlari ve teknoloji hisselerindeki risk istahi olmaya devam ediyor.",
      `Kapsamda ${REQUIRED_MACRO_COVERAGE_LABELS.join(", ")} basliklari yer aliyor.`,
      `Ortalama risk skoru ${averageRisk.toFixed(0)}/100 seviyesinde; ${bullishCount} varlik pozitif, ${bearishCount} varlik negatif sinyal tarafinda.`,
      "Altin, gumus ve paladyum reel faiz beklentisi ile sanayi talebi arasinda okunurken; Brent petrol enerji maliyeti, enflasyon baskisi ve enerji hisselerinin nakit akisi beklentileri icin kritik gosterge olmaya devam ediyor. Dolar/TL ve Euro/TL yerel varlik fiyatlamalarinda ana geciskenlik kanali olarak izlenmeli. BIST 100 tarafinda banka, sanayi ve ihracatci sirketlerin kur/faiz dengesine verdigi tepki onemli. ABD tarafinda Dow Jones daha genis ekonomik donguye, Nasdaq ise yapay zeka ve buyume temasina hassas. Cin, Japonya ve Uzak Dogu borsalari kuresel tedarik zinciri, yariletken talebi ve Asya risk istahi hakkinda erken sinyal verebilir. Bu nedenle rapordaki teknik sinyaller tek basina degil, haber akisi ve makro rejimle birlikte degerlendirilmelidir.",
      "Bu raporda teknik sinyallerin yanina portfoy davranisi acisindan da ikinci bir okuma eklenmelidir. Risk istahi guclendiginde buyume hisseleri, yapay zeka temasi ve Nasdaq benzeri endeksler daha hizli toparlanabilir; riskten kacis arttiginda altin, dolar likiditesi ve savunmaci sektorler daha fazla izlenir. Enerji tarafinda Brent petrolun yonu hem enflasyon beklentileri hem de enerji sirketlerinin nakit akisi icin belirleyicidir. Nukleer enerji temasi ise kisa vadeli fiyat hareketinden cok enerji guvenligi, uzun vadeli kapasite yatirimi ve kamu politikasi beklentileriyle birlikte okunmalidir.",
      "Asya piyasalarindaki hareketler raporun erken uyari katmanidir. Cin tarafinda buyume, kredi genislemesi ve gayrimenkul hassasiyeti; Japonya tarafinda yen, faiz farki ve ihracatci sirketlerin rekabet gucu; Uzak Dogu genelinde ise teknoloji tedarik zinciri ve yari iletken talebi izlenmelidir. Bu basliklar ABD ve Avrupa seanslarina gecmeden once risk algisini sekillendirebilir. Bu nedenle raporda yer alan AL, SAT veya IZLE ifadeleri yalnizca teknik bir sonuc degil, daha genis makro resmin icinde anlam kazanan egitsel sinyallerdir.",
    ].join(" "),
    marketRegime: averageRisk >= 70 ? "Yuksek oynaklik / temkinli rejim" : averageRisk >= 45 ? "Dengeli ama secici risk rejimi" : "Daha sakin risk rejimi",
    riskAppetite: bullishCount > bearishCount ? "Risk istahi secici bicimde pozitif" : bearishCount > bullishCount ? "Risk istahi zayif ve savunmaci" : "Risk istahi dengeli",
    keyTakeaways: [
      topMovers.length > 0
        ? `En dikkat cekici hareketler: ${topMovers.map((asset) => `${asset.displayName} ${formatPercent(asset.analysis?.changePercent)}`).join(", ")}.`
        : "Yeterli fiyat verisi olan varliklarda belirgin hareket siniri olusmadi.",
      "Altin, gumus, petrol, dolar/TL ve ana endeksler birlikte okunmadan tekil sinyal karara donusturulmamali.",
      "Haber akisi merkez bankalari, enerji fiyatlari, AI hisseleri ve Asya piyasalari etrafinda izlenmeli.",
    ],
    newsSummary: news.slice(0, 6).map((item) => `${item.source}: ${item.title}`).join(" | "),
    assets: assets.map((asset) => buildDeterministicAssetDraft(asset, news)),
  };
}

function findDraftAsset(draft: AgentReportDraft, symbol: string) {
  return draft.assets.find((asset) => asset.symbol.toUpperCase() === symbol.toUpperCase());
}

function buildDeterministicAssetDraft(asset: AgentAssetAnalysis, news: AgentNewsItem[]): AgentReportDraft["assets"][number] {
  const analysis = asset.analysis;
  const signal = getSignalLabel(analysis?.signal.signal);
  const risk = analysis?.risk.level ?? "ORTA";
  const latestPoint = analysis?.technicalSeries?.points.at(-1);
  const relatedNews =
    news.find((item) => item.category === asset.category) ??
    news.find((item) => item.category === "macro") ??
    news[0];

  return {
    symbol: asset.symbol,
    technicalCommentary: analysis
      ? `${asset.displayName} icin ${AI_MARKET_AGENT_INTERVAL} teknik sinyal ${signal}; fiyat degisimi ${formatPercent(analysis.changePercent)}, RSI ${analysis.indicators.rsi?.toFixed(1) ?? "n/a"}, MACD histogram ${analysis.indicators.macd.histogram?.toFixed(4) ?? "n/a"}. ${analysis.signal.reasons.join(" ")}`
      : `${asset.displayName} icin veri saglayici bu turda yeterli seri dondurmedi; raporda bu varlik yine de makro sepet ve haber akisi icinde izlenmelidir. Hata: ${asset.error ?? "bilinmeyen veri hatasi"}.`,
    macroCommentary: asset.required
      ? `${asset.whyRequired ?? asset.category} nedeniyle zorunlu makro kapsam icindedir; diger varlik sinyalleri bu baslikla birlikte okunmalidir.`
      : "Favori varlik oldugu icin zorunlu makro sepet, risk istahi ve haber akisiyle birlikte degerlendirilmelidir.",
    newsCommentary: relatedNews
      ? `${relatedNews.source}: ${relatedNews.title}`
      : "Bu turda dogrudan ilgili haber basligi bulunamadi; teknik sinyal makro kosullarla birlikte izlenmeli.",
    watchLevels: [
      analysis?.indicators.ema20 ? `EMA20: ${analysis.indicators.ema20.toFixed(2)}` : "EMA20 verisi izlenemedi",
      analysis?.indicators.ema50 ? `EMA50: ${analysis.indicators.ema50.toFixed(2)}` : "EMA50 verisi izlenemedi",
      latestPoint?.ichimokuBase ? `Ichimoku baz: ${latestPoint.ichimokuBase.toFixed(2)}` : "Ichimoku baz verisi izlenemedi",
      `Risk: ${risk}`,
    ],
    scenarios: [
      "Pozitif senaryo: fiyat EMA20/EMA50 uzerinde kalir ve MACD histogram toparlanirsa momentum guclenebilir.",
      "Negatif senaryo: fiyat Ichimoku bazinin ve kisa ortalamalarin altinda kalirsa temkin seviyesi artar.",
      "Notr senaryo: RSI 45-55 bandinda kalirsa yon teyidi icin hacim ve haber akisi beklenir.",
    ],
  };
}

async function getFavoriteSymbols(userId?: string | null) {
  if (!userId) {
    return DEFAULT_AI_MARKET_FAVORITES;
  }

  return getUserFavoriteSymbols(userId);
}

export async function runAiMarketAgent(options: RunAiMarketAgentOptions = {}) {
  const periodKey = getPeriodKey();
  const scope = options.userId ? "USER" : "GLOBAL";
  const existing = await prisma.aiMarketReport.findFirst({
    where: {
      periodKey,
      scope,
      userId: options.userId ?? null,
    },
    select: { id: true },
  });

  if (existing && !options.force) {
    return {
      reportId: existing.id,
      periodKey,
      reused: true,
      fallbackUsed: false,
    };
  }

  const favorites = await getFavoriteSymbols(options.userId);
  const [assets, news] = await Promise.all([analyzeAgentAssets(favorites), collectAgentNews()]);
  let fallbackUsed = false;
  let model: string | null = null;
  let rawAiPayload: unknown = null;
  let draft: AgentReportDraft;

  try {
    const aiResult = await generateAiReportDraft(assets, news);

    if (aiResult) {
      draft = aiResult.draft;
      model = aiResult.model;
      rawAiPayload = aiResult.rawPayload;
    } else {
      fallbackUsed = true;
      draft = buildFallbackDraft(assets, news);
    }
  } catch (error) {
    fallbackUsed = true;
    rawAiPayload = { error: error instanceof Error ? error.message : "AI raporu uretilemedi." };
    draft = buildFallbackDraft(assets, news);
  }

  if (existing && options.force) {
    await prisma.aiMarketReport.delete({ where: { id: existing.id } });
  }

  const report = await prisma.aiMarketReport.create({
    data: {
      userId: options.userId ?? null,
      periodKey,
      scope,
      model,
      macroSummary: expandMacroSummary(draft.macroSummary, assets, news),
      marketRegime: draft.marketRegime,
      riskAppetite: draft.riskAppetite,
      keyTakeaways: draft.keyTakeaways,
      requiredCoverage: REQUIRED_MACRO_COVERAGE_LABELS,
      newsSummary: draft.newsSummary,
      dataSnapshot: {
        favoriteSymbols: favorites,
        analyzedSymbols: assets.map((asset) => asset.symbol),
        failures: assets.filter((asset) => asset.error).map((asset) => ({ symbol: asset.symbol, error: asset.error })),
      },
      rawAiPayload: rawAiPayload === null ? undefined : (rawAiPayload as Prisma.InputJsonValue),
      fallbackUsed,
      disclaimer: AI_MARKET_DISCLAIMER,
      assets: {
        create: assets.map((asset) => {
          const draftAsset = findDraftAsset(draft, asset.symbol);
          const guaranteedDraftAsset = draftAsset ?? buildDeterministicAssetDraft(asset, news);
          const analysis = asset.analysis;

          return {
            symbol: asset.symbol,
            displayName: asset.displayName,
            assetClass: asset.assetClass,
            category: asset.category,
            lastPrice: analysis?.lastPrice,
            changePercent: analysis?.changePercent,
            signalType: getSignalLabel(analysis?.signal.signal),
            confidence: analysis?.signal.confidence,
            riskScore: analysis?.risk.score,
            opportunityScore: analysis?.signal.confidence,
            technicalCommentary: localizeSignalText(guaranteedDraftAsset.technicalCommentary),
            macroCommentary: localizeSignalText(guaranteedDraftAsset.macroCommentary),
            newsCommentary: localizeSignalText(guaranteedDraftAsset.newsCommentary),
            watchLevels: guaranteedDraftAsset.watchLevels,
            scenarios: guaranteedDraftAsset.scenarios,
            sourcePayload: {
              required: asset.required,
              whyRequired: asset.whyRequired,
              error: asset.error,
              interval: AI_MARKET_AGENT_INTERVAL,
              signalReasons: analysis?.signal.reasons,
              riskReasons: analysis?.risk.reasons,
              indicators: analysis?.indicators,
              technicalSeries: analysis?.technicalSeries,
            },
          };
        }),
      },
      newsItems: {
        create: news.map((item) => ({
          title: item.title,
          link: item.link,
          source: item.source,
          publishedAt: item.publishedAt ? new Date(item.publishedAt) : null,
          category: item.category,
          relevance: item.relevance,
        })),
      },
    },
    select: { id: true },
  });

  return {
    reportId: report.id,
    periodKey,
    reused: false,
    fallbackUsed,
  };
}
