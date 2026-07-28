import { describe, expect, it } from "vitest";
import {
  buildInstitutionalChatInstruction,
  buildInstitutionalOpenAiRequest,
  enforceVipInvestmentEvidence,
  ensureInstitutionalChatDisclosure,
  extractInstitutionalChatResult,
  getInstitutionalChatDisclosure,
  requiresVipWebResearch,
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

  it("does not require web research for VIP site, membership, or navigation help", () => {
    for (const question of [
      "VIP üyeliğim ne zaman bitiyor?",
      "Sanal portföy sayfasına nasıl giderim?",
      "Enbilir sitesinde raporları nereden açarım?",
    ]) {
      expect(requiresVipWebResearch(question)).toBe(false);

      const body = buildInstitutionalOpenAiRequest({
        model: "gpt-4.1",
        question,
        contextText: "VIP site evidence",
        history: [],
        locale: "tr",
        tier: "VIP",
      });

      expect(body).not.toHaveProperty("tools");
      expect(body).not.toHaveProperty("tool_choice");
      expect(body).not.toHaveProperty("include");
    }
  });

  it("keeps cited web research mandatory for current VIP market questions", () => {
    expect(requiresVipWebResearch("AAPL için güncel fiyatı ve katalizörleri doğrula")).toBe(true);
    expect(requiresVipWebResearch("Bugün piyasalarda ne oldu?")).toBe(true);
    expect(requiresVipWebResearch("NVDA ne olur?")).toBe(true);
    expect(requiresVipWebResearch("What is your outlook for MSFT?")).toBe(true);
  });

  it("appends the mandatory disclosure exactly once", () => {
    const disclosure = getInstitutionalChatDisclosure("tr");
    const once = ensureInstitutionalChatDisclosure("Kanıta dayalı görüş.", "tr");
    const twiceProtected = ensureInstitutionalChatDisclosure(once, "tr");

    expect(once.endsWith(disclosure)).toBe(true);
    expect(twiceProtected.split(disclosure)).toHaveLength(2);
  });

  it("does not treat one citation as verification of a whole multi-claim answer", () => {
    const answer = [
      "Şirketin geri alım yetkisi resmî bildirimde doğrulandı.",
      "Marjların gelecek yıl kesin olarak iki katına çıkacağı iddia ediliyor.",
      "Teknik görünümün her koşulda AL verdiği söyleniyor.",
    ].join("\n\n");
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
      webSearchUsed: true,
      researchCoverage: "partial",
      researched: false,
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
      webSearchUsed: false,
      researchCoverage: "none",
      researched: false,
    });
  });

  it("downgrades an uncited target even when an unrelated sentence has one web citation", () => {
    const answer = [
      "Şirketin ana sayfası yeni ürün adını gösteriyor.",
      "Karne: Güven 91/100, risk 28/100. Giriş 198-204 USD, stop 189 USD ve hedef 235 USD.",
    ].join("\n\n");
    const citedText = "ana sayfası";
    const startIndex = answer.indexOf(citedText);
    const result = enforceVipInvestmentEvidence({
      answer,
      citations: [{
        title: "Company home page",
        url: "https://company.example.test/",
        startIndex,
        endIndex: startIndex + citedText.length,
      }],
      webSearchUsed: true,
      researchCoverage: "partial",
      researched: false,
    }, "tr", "AAPL son fiyat 210 USD.");

    expect(result.accepted).toBe(false);
    expect(result.answer).toContain("İZLE / KANIT YETERSİZ");
    expect(result.answer).not.toContain("235 USD");
    expect(result.answer).not.toContain("91/100");
    expect(result.unsupportedClaims).toEqual(
      expect.arrayContaining([expect.stringContaining("hedef 235 USD")]),
    );
  });

  it("allows an actionable numeric claim when that exact claim has claim-level evidence", () => {
    const answer = "Teknik plan: giriş 198-204 USD, stop 189 USD ve hedef 235 USD.";
    const result = enforceVipInvestmentEvidence({
      answer,
      citations: [{
        title: "Exchange evidence",
        url: "https://exchange.example.test/aapl",
        startIndex: 0,
        endIndex: answer.length,
      }],
      webSearchUsed: true,
      researchCoverage: "substantial",
      researched: true,
    }, "tr", "");

    expect(result.accepted).toBe(true);
    expect(result.answer).toBe(answer);
    expect(result.unsupportedClaims).toEqual([]);
  });

  it("allows exact deterministic levels already present in verified Enbilir context", () => {
    const answer = "Karne: güven 76/100, risk 49/100. Giriş 198-204 USD, stop 189 USD ve hedef 235 USD.";
    const result = enforceVipInvestmentEvidence({
      answer,
      citations: [],
      webSearchUsed: true,
      researchCoverage: "partial",
      researched: false,
    }, "tr", "confidence=76; risk=49; entry=198-204; stop=189; target=235");

    expect(result.accepted).toBe(true);
    expect(result.answer).toBe(answer);
  });

  it("detects a Turkish entry claim even when it is the only material metric", () => {
    const result = enforceVipInvestmentEvidence({
      answer: "Giriş 198 USD.",
      citations: [],
      webSearchUsed: true,
      researchCoverage: "partial",
      researched: false,
    }, "tr", "");

    expect(result.accepted).toBe(false);
    expect(result.answer).toContain("İZLE / KANIT YETERSİZ");
  });
});
