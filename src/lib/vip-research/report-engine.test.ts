import { describe, expect, it } from "vitest";

import { extractAnnotatedSources } from "@/lib/vip-research/report-engine";

describe("VIP report retrieved-source boundary", () => {
  it("never turns the model's own surrounding prose into retrieved source evidence", () => {
    const text = "Apple yeni ürün lansmanını Q4 2026 için doğruladı.";
    const sources = extractAnnotatedSources({
      output: [{
        type: "message",
        content: [{
          type: "output_text",
          text,
          annotations: [{
            type: "url_citation",
            title: "Apple newsroom",
            url: "https://www.apple.com/newsroom/",
            start_index: 0,
            end_index: text.length,
          }],
        }],
      }],
    });

    expect(sources).toEqual([{
      title: "Apple newsroom",
      url: "https://www.apple.com/newsroom/",
    }]);
    expect(sources[0]).not.toHaveProperty("evidenceText");
  });
});
