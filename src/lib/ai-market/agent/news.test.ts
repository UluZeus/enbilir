import { afterEach, describe, expect, it, vi } from "vitest";

import { collectAgentNews } from "@/lib/ai-market/agent/news";

function rssItem(title: string, source: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
    <rss><channel><item>
      <title><![CDATA[${title}]]></title>
      <link>https://example.invalid/story</link>
      <source>${source}</source>
      <pubDate>Tue, 04 Aug 2026 09:00:00 GMT</pubDate>
    </item></channel></rss>`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("agent RSS ingestion bounds", () => {
  it("preserves title/source values exactly at their MySQL code-point limits", async () => {
    const title = "😀".repeat(512);
    const source = "Ş".repeat(191);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(rssItem(title, source), { status: 200 })));

    const items = await collectAgentNews(1);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe(title);
    expect(items[0].source).toBe(source);
    expect(Array.from(items[0].title)).toHaveLength(512);
    expect(Array.from(items[0].source)).toHaveLength(191);
  });

  it("truncates 513/192-code-point untrusted fields without splitting Unicode pairs", async () => {
    const title = `${"😀".repeat(512)}X`;
    const source = `${"Ş".repeat(191)}X`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(rssItem(title, source), { status: 200 })));

    const items = await collectAgentNews(1);

    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("😀".repeat(512));
    expect(items[0].source).toBe("Ş".repeat(191));
    expect(Array.from(items[0].title)).toHaveLength(512);
    expect(Array.from(items[0].source)).toHaveLength(191);
  });
});
