export type AgentNewsItem = {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  category: string;
  relevance: number;
};

const NEWS_FEEDS = [
  { category: "macro", query: "global markets central bank inflation bonds when:1d" },
  { category: "turkey", query: "Turkiye ekonomi BIST dolar TL enflasyon faiz when:1d" },
  { category: "metals", query: "gold silver palladium commodities market when:1d" },
  { category: "energy", query: "brent oil energy stocks natural gas when:1d" },
  { category: "ai-stocks", query: "artificial intelligence stocks Nvidia AMD Microsoft when:1d" },
  { category: "nuclear-energy", query: "uranium nuclear energy stocks Cameco when:1d" },
  { category: "asia", query: "China Japan Asian stock markets Nikkei Hang Seng when:1d" },
  { category: "fx", query: "US dollar euro Turkish lira forex when:1d" },
];

const FALLBACK_NEWS: AgentNewsItem[] = [
  {
    title: "Kuresel piyasalarda merkez bankasi patikasi ve risk istahi izleniyor",
    link: "https://news.google.com",
    source: "Google News",
    publishedAt: new Date().toISOString(),
    category: "macro",
    relevance: 0.55,
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
  const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? decodeXmlEntities(match[1].replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "")) : "";
}

function getFeedUrl(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=tr&gl=TR&ceid=TR:tr`;
}

function sourceScore(source: string) {
  if (/Bloomberg|Reuters|CNBC|Financial Times|Wall Street Journal|Ekonomim|Dunya|TRT|Anadolu/i.test(source)) {
    return 0.25;
  }

  return 0;
}

async function fetchFeed(category: string, query: string): Promise<AgentNewsItem[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6500);

  const response = await fetch(getFeedUrl(query), {
    headers: {
      Accept: "application/rss+xml, application/xml;q=0.9, text/xml;q=0.8",
      "User-Agent": "Mozilla/5.0 (compatible; EnbilirAgent/1.0; +https://enbilir.com)",
    },
    signal: controller.signal,
  });

  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(`News feed failed (${response.status})`);
  }

  const xml = await response.text();

  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 8).map((match, index) => {
    const itemXml = match[1];
    const title = matchTag(itemXml, "title").replace(/\s*-\s*[^-]+$/, "").trim();
    const source = matchTag(itemXml, "source") || "Google News";
    const publishedAt = matchTag(itemXml, "pubDate");

    return {
      title,
      link: matchTag(itemXml, "link"),
      source,
      publishedAt: publishedAt ? new Date(publishedAt).toISOString() : new Date().toISOString(),
      category,
      relevance: Math.max(0.1, 1 - index * 0.08 + sourceScore(source)),
    };
  }).filter((item) => item.title && item.link);
}

export async function collectAgentNews(limit = 30, lookbackDays = 1) {
  const safeLookbackDays = Math.min(Math.max(Math.round(lookbackDays), 1), 14);
  const settled = await Promise.allSettled(
    NEWS_FEEDS.map((feed) => fetchFeed(feed.category, feed.query.replace(/when:\d+d/g, `when:${safeLookbackDays}d`))),
  );
  const byTitle = new Map<string, AgentNewsItem>();

  for (const result of settled) {
    if (result.status !== "fulfilled") {
      continue;
    }

    for (const item of result.value) {
      const key = item.title.toLowerCase();
      const existing = byTitle.get(key);

      if (!existing || item.relevance > existing.relevance) {
        byTitle.set(key, item);
      }
    }
  }

  const items = Array.from(byTitle.values())
    .sort((left, right) => right.relevance - left.relevance)
    .slice(0, limit);

  return items.length > 0 ? items : FALLBACK_NEWS;
}
