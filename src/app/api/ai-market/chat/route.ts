import { NextResponse } from "next/server";
import { collectAgentNews } from "@/lib/ai-market/agent/news";
import {
  buildContextFromMarketItems,
  buildLocalMarketChatAnswer,
  buildMarketChatContextText,
  getMarketChatSources,
  type MarketChatLocale,
} from "@/lib/ai-market/market-chat";
import { getSessionUser } from "@/lib/auth";
import { getLiveMarketItems } from "@/lib/live-market";
import { getMembershipSnapshot } from "@/lib/membership";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ChatMessage = {
  role?: unknown;
  content?: unknown;
};

type ChatRequestBody = {
  message?: unknown;
  locale?: unknown;
  history?: unknown;
};

const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 18;
const requestBuckets = new Map<string, { count: number; resetAt: number }>();

function getClientKey(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  return forwardedFor || realIp || "local";
}

function isRateLimited(key: string) {
  const now = Date.now();
  const bucket = requestBuckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    requestBuckets.set(key, { count: 1, resetAt: now + rateLimitWindowMs });
    return false;
  }

  bucket.count += 1;
  return bucket.count > maxRequestsPerWindow;
}

function normalizeLocale(value: unknown): MarketChatLocale {
  return value === "en" ? "en" : "tr";
}

function normalizeMessage(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 700);
}

function normalizeHistory(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((message): { role: "user" | "assistant"; content: string } | null => {
      const entry = message as ChatMessage;
      const role = entry.role === "assistant" ? "assistant" : entry.role === "user" ? "user" : null;
      const content = normalizeMessage(entry.content);

      return role && content ? { role, content } : null;
    })
    .filter((message): message is { role: "user" | "assistant"; content: string } => Boolean(message))
    .slice(-6);
}

async function getLatestReport() {
  const report = await prisma.aiMarketReport.findFirst({
    where: { scope: "GLOBAL" },
    orderBy: { generatedAt: "desc" },
    select: { generatedAt: true, marketRegime: true, riskAppetite: true },
  });

  return report
    ? {
        generatedAt: report.generatedAt.toISOString(),
        marketRegime: report.marketRegime,
        riskAppetite: report.riskAppetite,
      }
    : null;
}

function getSystemInstruction(locale: MarketChatLocale, isVip: boolean) {
  if (locale === "en") {
    const vipContext = isVip
      ? "VIP mode is active: you may also use the supplied public RSS news context. Still do not browse the web yourself and do not invent facts beyond the supplied context."
      : "Standard mode is active: use only Enbilir live/cache site market data and internal macro labels.";

    return [
      "You are Enbilir AI Market Robot.",
      vipContext,
      "Use only the supplied context: live/cache market items, top risers/fallers, the latest internal macro report label, and VIP public RSS headlines when present.",
      "Do not browse the web, do not invent news, and do not claim access to data outside the site context.",
      "If the user asks for external news or unrelated topics, explain that you can only discuss Enbilir site data and market-literacy topics.",
      "Do not provide investment advice, direct buy/sell orders, or certainty. Keep answers concise, practical, and educational.",
    ].join(" ");
  }
  const vipContext = isVip
    ? "VIP mod aktiftir: verilen public RSS haber bağlamını da kullanabilirsin. Yine de kendin web taraması yapma ve verilen bağlam dışında haber uydurma."
    : "Standart mod aktiftir: yalnızca Enbilir canlı/cache site piyasa verilerini ve iç makro etiketleri kullan.";

  return [
    "Sen Enbilir AI Piyasa Robotusun.",
    vipContext,
    "Yalnızca verilen bağlamı kullan: canlı/cache piyasa verileri, yükselen/düşen listesi, sitedeki son makro rapor etiketi ve varsa VIP public RSS haber başlıkları.",
    "Web taraması yapma, dış haber uydurma, site bağlamı dışındaki veriye eriştiğini söyleme.",
    "Kullanıcı dış haber veya ilgisiz konu sorarsa sadece Enbilir site verileri ve piyasa okuryazarlığı konularında cevap verebildiğini açıkla.",
    "Yatırım tavsiyesi, kesin yön veya doğrudan al/sat emri verme. Kısa, anlaşılır ve eğitim odaklı cevap ver.",
  ].join(" ");
}

async function askOpenAi({
  question,
  contextText,
  history,
  locale,
  isVip,
}: {
  question: string;
  contextText: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  locale: MarketChatLocale;
  isVip: boolean;
}) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const model = isVip
    ? (process.env.OPENAI_VIP_MARKET_CHAT_MODEL || "gpt-4.1")
    : (process.env.OPENAI_MARKET_CHAT_MODEL || "gpt-4.1-mini");
  const historyText = history.map((message) => `${message.role}: ${message.content}`).join("\n").slice(-1800);
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: getSystemInstruction(locale, isVip),
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                "ENBILIR_SITE_CONTEXT",
                contextText,
                historyText ? `RECENT_CHAT\n${historyText}` : "",
                `USER_QUESTION\n${question}`,
              ].filter(Boolean).join("\n\n"),
            },
          ],
        },
      ],
      max_output_tokens: 520,
      temperature: 0.25,
      store: false,
    }),
  });

  if (!response.ok) {
    return null;
  }

  const payload = await response.json() as { output_text?: unknown; output?: Array<{ content?: Array<{ text?: unknown }> }> };

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  const text = payload.output
    ?.flatMap((item) => item.content ?? [])
    .map((content) => typeof content.text === "string" ? content.text : "")
    .join("\n")
    .trim();

  return text || null;
}

export async function POST(request: Request) {
  try {
    const clientKey = getClientKey(request);

    if (isRateLimited(clientKey)) {
      return NextResponse.json({ error: "Çok sık soru soruldu. Lütfen biraz sonra tekrar deneyin." }, { status: 429 });
    }

    let body: ChatRequestBody;

    try {
      body = await request.json() as ChatRequestBody;
    } catch {
      return NextResponse.json({ error: "Geçersiz istek." }, { status: 400 });
    }

    const locale = normalizeLocale(body.locale);
    const question = normalizeMessage(body.message);
    const history = normalizeHistory(body.history);

    if (!question) {
      return NextResponse.json({ error: locale === "tr" ? "Lütfen bir soru yazın." : "Please enter a question." }, { status: 400 });
    }

    const sessionUser = await getSessionUser();
    const fullUser = sessionUser
      ? await prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: { createdAt: true, membershipTier: true, vipPaidUntil: true },
        })
      : null;
    const membership = fullUser ? getMembershipSnapshot(fullUser) : null;
    const isVip = Boolean(membership?.isVipActive);
    const [items, latestReport, vipNews] = await Promise.all([
      getLiveMarketItems(),
      getLatestReport(),
      isVip ? collectAgentNews(24) : Promise.resolve(undefined),
    ]);
    const context = buildContextFromMarketItems(question, items, latestReport, vipNews);
    const fallbackAnswer = buildLocalMarketChatAnswer(question, context, locale);
    const contextText = buildMarketChatContextText(context, locale);

    let answer = fallbackAnswer;
    let mode: "openai" | "local" = "local";

    try {
      const aiAnswer = await askOpenAi({ question, contextText, history, locale, isVip });

      if (aiAnswer) {
        answer = aiAnswer;
        mode = "openai";
      }
    } catch {
      answer = fallbackAnswer;
    }

    return NextResponse.json({
      answer,
      mode,
      membership: isVip ? "VIP" : "STANDARD",
      updatedAt: context.updatedAt,
      sources: getMarketChatSources(context, locale),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "production"
          ? "AI sohbet yanıtı hazırlanamadı."
          : error instanceof Error ? error.message : "AI sohbet yanıtı hazırlanamadı.",
      },
      { status: 500 },
    );
  }
}
