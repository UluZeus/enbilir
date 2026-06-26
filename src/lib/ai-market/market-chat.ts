import { getTopFallersFrom, getTopRisersFrom } from "@/lib/live-market";
import type { AgentNewsItem } from "@/lib/ai-market/agent/news";
import type { MarketItem } from "@/lib/market-data";

export type MarketChatLocale = "tr" | "en";

export type MarketChatSource = {
  label: string;
  value: string;
};

export type MarketChatContext = {
  updatedAt: string;
  items: MarketItem[];
  topRisers: MarketItem[];
  topFallers: MarketItem[];
  matchedItems: MarketItem[];
  latestReport: {
    generatedAt: string;
    marketRegime: string | null;
    riskAppetite: string | null;
  } | null;
  vipNews?: AgentNewsItem[];
};

const symbolAliases: Record<string, string[]> = {
  BTC: ["btc", "bitcoin"],
  ETH: ["eth", "ether", "ethereum", "etherium"],
  SOL: ["sol", "solana"],
  BNB: ["bnb", "bnc", "binance"],
  LINK: ["link", "chainlink"],
  "USD/TRY": ["usdtry", "usd/try", "dolar", "dolar tl", "dolar/tl"],
  "EUR/TRY": ["eurtry", "eur/try", "euro", "euro tl", "euro/tl"],
  XAU: ["xau", "altin", "altın", "gold", "ons altin", "ons altın"],
  XAG: ["xag", "gumus", "gümüş", "silver", "ons gumus", "ons gümüş"],
};

const majorSymbols = ["BTC", "ETH", "SOL", "BNB", "XRP", "AVAX", "XAU/USD", "XAG/USD", "USD/TRY", "EUR/TRY"];

function normalizeText(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function includesTerm(haystack: string, term: string) {
  if (!term) {
    return false;
  }

  if (term.length <= 2) {
    return new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`, "i").test(haystack);
  }

  return haystack.includes(term);
}

export function findMarketChatMatches(question: string, items: MarketItem[]) {
  const normalizedQuestion = normalizeText(question);
  const matches = items.filter((item) => {
    const normalizedSymbol = normalizeText(item.symbol);
    const normalizedName = normalizeText(item.name);
    const normalizedMarket = normalizeText(item.market);
    const directHit =
      includesTerm(normalizedQuestion, normalizedSymbol) ||
      includesTerm(normalizedQuestion, normalizedSymbol.replace("/", "")) ||
      includesTerm(normalizedQuestion, normalizedName) ||
      includesTerm(normalizedQuestion, normalizedMarket);

    if (directHit) {
      return true;
    }

    return Object.entries(symbolAliases).some(([symbol, aliases]) => {
      const symbolMatches = normalizedSymbol.includes(normalizeText(symbol)) || normalizeText(symbol).includes(normalizedSymbol);
      return symbolMatches && aliases.some((alias) => normalizedQuestion.includes(normalizeText(alias)));
    });
  });

  return matches.slice(0, 8);
}

export function getMarketChatFocusItems(context: MarketChatContext) {
  const selected = context.matchedItems.length > 0
    ? context.matchedItems
    : context.items.filter((item) => majorSymbols.includes(item.symbol)).slice(0, 10);

  const merged = [...selected, ...context.topRisers.slice(0, 4), ...context.topFallers.slice(0, 4)];
  const seen = new Set<string>();

  return merged.filter((item) => {
    if (seen.has(item.symbol)) {
      return false;
    }

    seen.add(item.symbol);
    return true;
  }).slice(0, 18);
}

export function formatSignedPercent(value: number) {
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

  return `${value >= 0 ? "+" : ""}${formatted}%`;
}

function getDirectionText(changePercent: number, locale: MarketChatLocale) {
  if (changePercent > 1.5) {
    return locale === "tr" ? "belirgin pozitif" : "clearly positive";
  }

  if (changePercent > 0.25) {
    return locale === "tr" ? "ılımlı pozitif" : "mildly positive";
  }

  if (changePercent < -1.5) {
    return locale === "tr" ? "belirgin negatif" : "clearly negative";
  }

  if (changePercent < -0.25) {
    return locale === "tr" ? "ılımlı negatif" : "mildly negative";
  }

  return locale === "tr" ? "yatay / kararsız" : "flat / undecided";
}

function formatItemLine(item: MarketItem, locale: MarketChatLocale) {
  const status = item.dataStatus === "live"
    ? (locale === "tr" ? "canlı" : "live")
    : (locale === "tr" ? "cache/fallback" : "cache/fallback");

  const dataLabel = locale === "tr" ? "Veri" : "Data";
  const sourceLabel = locale === "tr" ? "kaynak" : "source";

  return `${item.name} (${item.symbol}): ${item.price} USD, ${formatSignedPercent(item.changePercent)}, ${getDirectionText(item.changePercent, locale)}. ${dataLabel}: ${status}, ${sourceLabel}: ${item.source}.`;
}

function isOffTopic(question: string) {
  const normalized = normalizeText(question);
  const allowed = [
    "piyasa", "borsa", "hisse", "kripto", "coin", "bitcoin", "ethereum", "etherium", "solana", "bnb", "bnc", "link",
    "altin", "gumus", "dolar", "euro", "tl", "emtia", "petrol", "endeks", "bist", "nasdaq", "dow", "portfoy",
    "sinyal", "risk", "haber", "makro", "rapor", "enbilir", "site", "asistan", "robot", "veri", "yukselen", "dusen",
  ];

  return !allowed.some((word) => normalized.includes(word));
}

function asksForNews(question: string) {
  const normalized = normalizeText(question);
  return normalized.includes("haber") || normalized.includes("son dakika") || normalized.includes("news");
}

function asksForRisers(question: string) {
  const normalized = normalizeText(question);
  return normalized.includes("yukselen") || normalized.includes("yükselen") || normalized.includes("riser") || normalized.includes("kazanan");
}

function asksForFallers(question: string) {
  const normalized = normalizeText(question);
  return normalized.includes("dusen") || normalized.includes("düşen") || normalized.includes("faller") || normalized.includes("kaybeden");
}

export function buildMarketChatContextText(context: MarketChatContext, locale: MarketChatLocale) {
  const focusItems = getMarketChatFocusItems(context);
  const reportText = context.latestReport
    ? `Latest site macro report: ${context.latestReport.marketRegime ?? "not labeled"}; risk appetite: ${context.latestReport.riskAppetite ?? "not labeled"}; generatedAt: ${context.latestReport.generatedAt}.`
    : "Latest site macro report: not available.";

  return [
    `Updated at: ${context.updatedAt}`,
    reportText,
    "Focused site market data:",
    ...focusItems.map((item) => formatItemLine(item, locale)),
    "Top risers:",
    ...context.topRisers.slice(0, 5).map((item) => formatItemLine(item, locale)),
    "Top fallers:",
    ...context.topFallers.slice(0, 5).map((item) => formatItemLine(item, locale)),
    context.vipNews?.length ? "VIP public news context:" : "",
    ...(context.vipNews ?? []).slice(0, 12).map((item) => `${item.title} | ${item.source} | ${item.category} | ${item.publishedAt} | ${item.link}`),
  ].join("\n");
}

export function buildLocalMarketChatAnswer(question: string, context: MarketChatContext, locale: MarketChatLocale) {
  const isTurkish = locale === "tr";

  if (isOffTopic(question)) {
    return isTurkish
      ? "Ben bu ekranda sadece Enbilir içindeki piyasa verileri, AI Asistan ekranı, sanal portföy mantığı ve sitedeki makro/piyasa başlıkları hakkında cevap verebilirim. Bu konulardan birini sorarsanız sitedeki güncel/cache veriye göre yardımcı olurum."
      : "In this panel I can only answer about Enbilir market data, the AI Assistant screen, virtual portfolio logic, and market/macro topics available inside the site.";
  }

  const lines: string[] = [];
  const matched = context.matchedItems;

  const hasVipNews = Boolean(context.vipNews?.length);

  lines.push(hasVipNews
    ? (isTurkish
        ? "Bu yanıtı Enbilir içindeki canlı/cache piyasa verisi ve VIP için derlenen ücretsiz public RSS haber başlıklarına göre veriyorum; bu bir yatırım tavsiyesi değildir."
        : "This answer uses Enbilir live/cache market data plus free public RSS headlines prepared for VIP users; this is not investment advice.")
    : (isTurkish
        ? "Bu yanıtı Enbilir içindeki canlı/cache piyasa verisine göre veriyorum; dış haber taraması yapmıyorum ve bu bir yatırım tavsiyesi değildir."
        : "This answer uses Enbilir live/cache market data only; I am not browsing external news and this is not investment advice."));

  if (asksForNews(question)) {
    lines.push(hasVipNews
      ? (isTurkish
          ? "Haber tarafında sitedeki makro raporun yanında VIP için toplanmış public RSS başlıklarını da okuyorum; başlıkları veri gibi değil, piyasa gündemi sinyali gibi değerlendirmek gerekir."
          : "For news, I also read the public RSS headlines collected for VIP users alongside the site's macro report; these headlines should be treated as market context, not hard data.")
      : (isTurkish
          ? "Haber tarafında yalnızca sitede oluşmuş makro rapor ve mevcut piyasa ekranı bağlamını okuyabilirim. Şu anda harici haber ajansı veya web araması kullanmıyorum."
          : "For news, I can only use the macro/report context already available inside the site. I am not using external news feeds or web search here."));
  }

  if (matched.length > 0) {
    lines.push(isTurkish ? "Sorduğun varlıklar için ekrandaki resim şöyle:" : "For the assets you asked about, the site picture is:");
    lines.push(...matched.slice(0, 5).map((item) => `- ${formatItemLine(item, locale)}`));
  } else {
    const risers = context.topRisers.slice(0, 3).map((item) => `${item.symbol} ${formatSignedPercent(item.changePercent)}`).join(", ");
    const fallers = context.topFallers.slice(0, 3).map((item) => `${item.symbol} ${formatSignedPercent(item.changePercent)}`).join(", ");
    lines.push(isTurkish
      ? `Genel resimde güçlü taraf: ${risers}. Zayıf taraf: ${fallers}.`
      : `Broad picture: strongest side ${risers}. Weakest side ${fallers}.`);
  }

  if (asksForRisers(question)) {
    lines.push(isTurkish ? "En çok yükselenler:" : "Top risers:");
    lines.push(...context.topRisers.slice(0, 5).map((item) => `- ${formatItemLine(item, locale)}`));
  }

  if (asksForFallers(question)) {
    lines.push(isTurkish ? "En çok düşenler:" : "Top fallers:");
    lines.push(...context.topFallers.slice(0, 5).map((item) => `- ${formatItemLine(item, locale)}`));
  }

  if (context.latestReport) {
    lines.push(isTurkish
      ? `Sitedeki son makro rapor etiketi: ${context.latestReport.marketRegime ?? "etiket yok"}. Risk iştahı: ${context.latestReport.riskAppetite ?? "etiket yok"}.`
      : `Latest site macro label: ${context.latestReport.marketRegime ?? "not labeled"}. Risk appetite: ${context.latestReport.riskAppetite ?? "not labeled"}.`);
  }

  if (context.vipNews?.length) {
    lines.push(isTurkish
      ? "VIP haber bağlamında ücretsiz public RSS kaynaklarından derlenen başlıklar şunlar:"
      : "VIP public RSS context includes these headlines:");
    lines.push(...context.vipNews.slice(0, 5).map((item) => `- ${item.title} (${item.source})`));
  }

  lines.push(isTurkish
    ? "Bunu karar emri gibi değil, piyasa okuma notu gibi kullanın: yön, hız, veri kaynağı ve risk birlikte değerlendirilmelidir."
    : "Use this as a market-literacy note, not as an order: direction, speed, data source, and risk should be read together.");

  return lines.join("\n\n");
}

export function getMarketChatSources(context: MarketChatContext, locale: MarketChatLocale): MarketChatSource[] {
  const liveCount = context.items.filter((item) => item.dataStatus === "live").length;
  const fallbackCount = context.items.length - liveCount;
  const isTurkish = locale === "tr";

  const sources = [
    { label: isTurkish ? "Piyasa verisi" : "Market data", value: isTurkish ? `${context.items.length} varlık` : `${context.items.length} assets` },
    { label: isTurkish ? "Canlı" : "Live", value: `${liveCount}` },
    { label: "Cache/Fallback", value: `${fallbackCount}` },
    { label: isTurkish ? "Güncelleme" : "Updated", value: new Intl.DateTimeFormat(isTurkish ? "tr-TR" : "en-US", { dateStyle: "short", timeStyle: "short" }).format(new Date(context.updatedAt)) },
  ];

  if (context.vipNews?.length) {
    sources.push({ label: isTurkish ? "VIP haber" : "VIP news", value: `${context.vipNews.length}` });
  }

  return sources;
}

export function buildContextFromMarketItems(
  question: string,
  items: MarketItem[],
  latestReport: MarketChatContext["latestReport"],
  vipNews?: AgentNewsItem[],
): MarketChatContext {
  return {
    updatedAt: new Date().toISOString(),
    items,
    topRisers: getTopRisersFrom(items).slice(0, 10),
    topFallers: getTopFallersFrom(items).slice(0, 10),
    matchedItems: findMarketChatMatches(question, items),
    latestReport,
    vipNews,
  };
}
