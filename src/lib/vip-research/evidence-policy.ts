import type { VipIdeaDraft, VipResearchCandidate, VipSource } from "@/lib/vip-research/types";

const CATALYST_EVENT_PATTERN = /(?:yeni\s+(?:ürün|hizmet|platform)|ürün\s+lansman|lansman|piyasaya\s+sür|launch|release|geri\s+alım|buyback|repurchase|ar-?ge|r&d|kapasite|tesis|yatırım|onay|approval|regülasyon|regulation|ruhsat|lisans|patent|klinik|satın\s+alma|birleşme|ihale|sözleşme|refinansman|borç\s+çevir|faiz\s+(?:indir|artır)|merkez\s+bankası|fomc|ecb|fed|stok|opec|üretim\s+(?:artış|kotası)|arz\s+kısıt|tarife|vergi|spot\s+etf|protokol\s+yükselt|network\s+upgrade|kilit\s+açılım|token\s+unlock|halving)/i;
const CATALYST_TIME_PATTERN = /(?:3\s*[-–]\s*12\s*ay|(?:3|4|5|6|7|8|9|10|11|12)\s*ay|önümüzdeki\s+(?:3|4|5|6|7|8|9|10|11|12)\s*ay|gelecek\s+(?:3|4|5|6|7|8|9|10|11|12)\s*ay|20\d{2}\s*(?:q[1-4]|[1-4][.\s]*çeyrek)|q[1-4]\s*20\d{2}|(?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|january|february|march|april|may|june|july|august|september|october|november|december)\s+20\d{2})/i;
const SOURCE_IDENTIFIER_STOP_WORDS = new Set([
  "abd", "and", "company", "corp", "corporation", "etf", "fund", "inc", "limited", "ltd", "plc", "trust", "usd", "vadeli", "yıl",
]);
const MAX_CATALYST_SOURCE_AGE_MS = 370 * 24 * 60 * 60 * 1000;

export function normalizeVipResearchSource(source: VipSource) {
  try {
    const url = new URL(source.url);
    const hostname = url.hostname.toLowerCase();

    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      !hostname.includes(".") ||
      hostname === "localhost" ||
      hostname.endsWith(".localhost")
    ) {
      return null;
    }

    return { ...source, url: url.toString() };
  } catch {
    return null;
  }
}

export function hasSpecificThreeToTwelveMonthCatalyst(catalysts: string[]) {
  return catalysts.some((catalyst) => {
    const normalized = catalyst.trim();
    return normalized.length >= 20 && CATALYST_EVENT_PATTERN.test(normalized) && CATALYST_TIME_PATTERN.test(normalized);
  });
}

export function sourceMatchesCandidate(source: VipSource, candidate: Pick<VipResearchCandidate, "symbol" | "providerSymbol" | "displayName">) {
  const haystackTokens = new Set(
    `${source.title} ${source.url} ${source.evidenceText ?? ""}`
      .toLocaleLowerCase("tr-TR")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean),
  );
  const identifiers = [candidate.symbol, candidate.providerSymbol, candidate.displayName]
    .flatMap((value) => value.toLocaleLowerCase("tr-TR").split(/[^\p{L}\p{N}]+/u))
    .filter((value) => value.length >= 3 && !SOURCE_IDENTIFIER_STOP_WORDS.has(value));

  return identifiers.some((identifier) => haystackTokens.has(identifier));
}

export function sourceSupportsCandidateCatalyst(source: VipSource, catalysts: string[]) {
  const evidence = source.evidenceText?.replace(/\s+/g, " ").trim() ?? "";

  if (evidence.length < 24 || !CATALYST_EVENT_PATTERN.test(evidence) || !CATALYST_TIME_PATTERN.test(evidence)) {
    return false;
  }

  const evidenceTokens = new Set(
    evidence.toLocaleLowerCase("tr-TR")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 4 && !SOURCE_IDENTIFIER_STOP_WORDS.has(token)),
  );

  return catalysts.some((catalyst) => {
    const catalystTokens = catalyst.toLocaleLowerCase("tr-TR")
      .split(/[^\p{L}\p{N}]+/u)
      .filter((token) => token.length >= 4 && !SOURCE_IDENTIFIER_STOP_WORDS.has(token));
    const distinctCatalystTokens = Array.from(new Set(catalystTokens));
    const overlap = distinctCatalystTokens.filter((token) => evidenceTokens.has(token)).length;

    return overlap >= 4 && overlap / Math.max(1, distinctCatalystTokens.length) >= 0.55;
  });
}

function isRecentCatalystSource(source: VipSource, now: Date) {
  if (!source.publishedAt) return false;
  const publishedAt = new Date(source.publishedAt).getTime();
  const age = now.getTime() - publishedAt;
  return Number.isFinite(publishedAt) && age >= -5 * 60 * 1000 && age <= MAX_CATALYST_SOURCE_AGE_MS;
}

export function getVerifiedCandidateSources(
  annotatedSources: VipSource[],
  candidate: Pick<VipResearchCandidate, "symbol" | "providerSymbol" | "displayName">,
  catalysts: string[],
  now = new Date(),
) {
  const verified = annotatedSources
    .filter((source) =>
      isRecentCatalystSource(source, now)
      && sourceMatchesCandidate(source, candidate)
      && sourceSupportsCandidateCatalyst(source, catalysts))
    .map(normalizeVipResearchSource)
    .filter((source): source is VipSource => source !== null);

  return Array.from(new Map(verified.map((source) => [source.url, source])).values());
}

export function applyVipBuyEvidenceGate(input: {
  stance: VipIdeaDraft["stance"];
  riskVeto: boolean;
  catalysts: string[];
  sources: VipSource[];
  now?: Date;
}): VipIdeaDraft["stance"] {
  if (input.stance !== "AL") {
    return input.stance;
  }

  if (input.riskVeto) {
    return "UZAK_DUR";
  }

  const now = input.now ?? new Date();
  const hasVerifiedSource = input.sources.some((source) =>
    normalizeVipResearchSource(source) !== null
    && isRecentCatalystSource(source, now)
    && sourceSupportsCandidateCatalyst(source, input.catalysts));
  return hasVerifiedSource && hasSpecificThreeToTwelveMonthCatalyst(input.catalysts) ? "AL" : "IZLE";
}
