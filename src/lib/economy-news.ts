export type EconomyHeadline = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
};

const ECONOMY_FEED_URL = "https://news.google.com/rss/search?q=ekonomi+when:1d&hl=tr&gl=TR&ceid=TR:tr";
const BLOCKED_TITLE_PATTERNS = [
  /vietnam/i,
  /kabul/i,
  /üniversite/i,
  /universit/i,
  /maaşları/i,
  /canlı - ekonomi masası/i,
];
const PREFERRED_SOURCE_PATTERNS = [
  /Bloomberght/i,
  /Ekonomi Gazetesi/i,
  /Ekonomim/i,
  /Bigpara/i,
  /TRT Haber/i,
  /Ekonomi Dünya/i,
];
const FALLBACK_HEADLINES: EconomyHeadline[] = [
  {
    title: "Küresel piyasalarda geçici anlaşma coşkusu",
    link: "https://www.bloomberght.com",
    source: "Bloomberght",
    publishedAt: "2026-06-15T05:59:55Z",
  },
  {
    title: "Ücretli çalışan sayısı martta 23,4 milyona yaklaştı",
    link: "https://www.ekonomigazetesi.com",
    source: "Ekonomi Gazetesi",
    publishedAt: "2026-06-15T05:04:14Z",
  },
  {
    title: "OSD verileri: Otomotiv üretimi ve ihracatında gerileme, gelirde artış",
    link: "https://www.ekonomidunya.com",
    source: "Ekonomi Dünya",
    publishedAt: "2026-06-15T05:46:53Z",
  },
  {
    title: "BOJ, 1995’ten bu yana en yüksek faize hazırlanıyor",
    link: "https://www.bloomberght.com",
    source: "Bloomberght",
    publishedAt: "2026-06-15T04:26:59Z",
  },
];

function decodeXmlEntities(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#8217;/g, "'")
    .replace(/&#8230;/g, "...")
    .trim();
}

function matchTag(content: string, tag: string) {
  const match = content.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1]) : "";
}

function normalizeTitle(title: string) {
  return title.replace(/\s*-\s*[^-]+$/, "").trim();
}

function isRelevantHeadline(item: EconomyHeadline) {
  if (!item.title || !item.link || !item.source) {
    return false;
  }

  if (BLOCKED_TITLE_PATTERNS.some((pattern) => pattern.test(item.title))) {
    return false;
  }

  return true;
}

function getSourceScore(source: string) {
  const preferredIndex = PREFERRED_SOURCE_PATTERNS.findIndex((pattern) => pattern.test(source));
  return preferredIndex === -1 ? 100 : preferredIndex;
}

export async function getEconomyHeadlines(limit = 4): Promise<EconomyHeadline[]> {
  try {
    const response = await fetch(ECONOMY_FEED_URL, {
      headers: {
        Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
        "User-Agent": "Mozilla/5.0 (compatible; EnbilirBot/1.0; +https://enbilir.com)",
      },
      next: { revalidate: 900 },
    });

    if (!response.ok) {
      return FALLBACK_HEADLINES.slice(0, limit);
    }

    const xml = await response.text();
    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)]
      .map((match) => {
        const itemXml = match[1];
        return {
          title: normalizeTitle(matchTag(itemXml, "title")),
          link: matchTag(itemXml, "link"),
          source: matchTag(itemXml, "source"),
          publishedAt: matchTag(itemXml, "pubDate"),
        } satisfies EconomyHeadline;
      })
      .filter(isRelevantHeadline)
      .sort((left, right) => {
        const sourceDelta = getSourceScore(left.source) - getSourceScore(right.source);

        if (sourceDelta !== 0) {
          return sourceDelta;
        }

        return new Date(right.publishedAt).getTime() - new Date(left.publishedAt).getTime();
      });

    const uniqueByTitle = new Map<string, EconomyHeadline>();

    for (const item of items) {
      if (!uniqueByTitle.has(item.title)) {
        uniqueByTitle.set(item.title, item);
      }
    }

    const headlines = Array.from(uniqueByTitle.values()).slice(0, limit);
    return headlines.length > 0 ? headlines : FALLBACK_HEADLINES.slice(0, limit);
  } catch {
    return FALLBACK_HEADLINES.slice(0, limit);
  }
}
