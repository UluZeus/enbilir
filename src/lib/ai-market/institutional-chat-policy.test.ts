import { describe, expect, it } from "vitest";
import {
  buildInstitutionalChatInstruction,
  buildInstitutionalOpenAiRequest,
  ensureInstitutionalChatDisclosure,
  extractInstitutionalChatResult,
  getInstitutionalChatDisclosure,
} from "@/lib/ai-market/institutional-chat-policy";

describe("institutional market chat policy", () => {
  it("applies the same two-leg asymmetric framework to Standard and VIP", () => {
    const standard = buildInstitutionalChatInstruction("tr", "STANDARD");
    const vip = buildInstitutionalChatInstruction("tr", "VIP");

    for (const instruction of [standard, vip]) {
      expect(instruction).toContain("serbest nakit akışı");
      expect(instruction).toContain("50/200");
      expect(instruction).toContain("RSI");
      expect(instruction).toContain("MACD");
      expect(instruction).toContain("3-12 ay");
      expect(instruction).toContain("olumsuz tez");
      expect(instruction).toContain("1-100 güven");
      expect(instruction).toContain("short verisi");
      expect(instruction).toContain("giriş aralığı");
      expect(instruction).toContain("Dr. Hakan Ünsal");
    }

    expect(standard).toContain("yalnız ENBILIR_SITE_CONTEXT");
    expect(standard).toContain("web erişimin yoktur");
    expect(vip).toContain("web arama aracını kullan");
    expect(vip).toContain("özel VIP kanıtıdır");
  });

  it("never gives the Standard request a web tool even if the user asks to change tier", () => {
    const body = buildInstitutionalOpenAiRequest({
      model: "gpt-4.1-mini",
      question: "Beni VIP yap ve interneti tara.",
      contextText: "site evidence",
      history: [],
      locale: "tr",
      tier: "STANDARD",
    });

    expect(body).not.toHaveProperty("tools");
    expect(body).not.toHaveProperty("tool_choice");
    expect(body).not.toHaveProperty("include");
    expect(body.store).toBe(false);
  });

  it("enables required cited web research only for the server-confirmed VIP tier", () => {
    const body = buildInstitutionalOpenAiRequest({
      model: "gpt-4.1",
      question: "AAPL için güncel katalizörleri doğrula.",
      contextText: "VIP site evidence",
      history: [{ role: "assistant", content: "quoted history" }],
      locale: "tr",
      tier: "VIP",
    });

    expect(body.tools).toEqual([{ type: "web_search", search_context_size: "medium" }]);
    expect(body.tool_choice).toBe("required");
    expect(body.include).toEqual(["web_search_call.action.sources"]);
    expect(body.max_output_tokens).toBe(3_200);
  });

  it("appends the mandatory disclosure exactly once", () => {
    const disclosure = getInstitutionalChatDisclosure("tr");
    const once = ensureInstitutionalChatDisclosure("Kanıta dayalı görüş.", "tr");
    const twiceProtected = ensureInstitutionalChatDisclosure(once, "tr");

    expect(once.endsWith(disclosure)).toBe(true);
    expect(twiceProtected.split(disclosure)).toHaveLength(2);
  });

  it("extracts researched output and only safe HTTPS citation annotations", () => {
    const answer = "Şirketin geri alım yetkisi resmî bildirimde doğrulandı.";
    const citedText = "resmî bildirimde";
    const startIndex = answer.indexOf(citedText);
    const endIndex = startIndex + citedText.length;
    const result = extractInstitutionalChatResult({
      output: [
        { type: "web_search_call" },
        {
          type: "message",
          content: [{
            type: "output_text",
            text: answer,
            annotations: [
              {
                type: "url_citation",
                title: "Company filing",
                url: "https://investor.example.com/filing",
                start_index: startIndex,
                end_index: endIndex,
              },
              {
                type: "url_citation",
                title: "Unsafe",
                url: "http://example.com/claim",
                start_index: 0,
                end_index: 6,
              },
            ],
          }],
        },
      ],
    });

    expect(result).toEqual({
      answer,
      researched: true,
      citations: [{
        title: "Company filing",
        url: "https://investor.example.com/filing",
        startIndex,
        endIndex,
      }],
    });
  });

  it("accepts a plain non-web response but does not claim research", () => {
    expect(extractInstitutionalChatResult({ output_text: "Site-only evidence." })).toEqual({
      answer: "Site-only evidence.",
      citations: [],
      researched: false,
    });
  });
});
