import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 12;
const maxAudioSizeBytes = 8 * 1024 * 1024;
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

function normalizeLocale(value: FormDataEntryValue | null) {
  return value === "en" ? "en" : "tr";
}

function getErrorMessage(locale: "tr" | "en", key: "missing" | "size" | "config" | "failed") {
  const messages = {
    tr: {
      missing: "Ses kaydı alınamadı. Lütfen tekrar deneyin.",
      size: "Ses kaydı çok büyük. Daha kısa bir soru sorun.",
      config: "Ses çözümleme servisi yapılandırılmamış. OPENAI_API_KEY gerekli.",
      failed: "Ses yazıya çevrilemedi. Lütfen tekrar deneyin.",
    },
    en: {
      missing: "No audio recording was received. Please try again.",
      size: "The audio recording is too large. Please ask a shorter question.",
      config: "Voice transcription is not configured. OPENAI_API_KEY is required.",
      failed: "Voice could not be transcribed. Please try again.",
    },
  };

  return messages[locale][key];
}

export async function POST(request: Request) {
  let locale: "tr" | "en" = "tr";

  try {
    const clientKey = getClientKey(request);

    if (isRateLimited(clientKey)) {
      return NextResponse.json({ error: "Çok sık sesli soru gönderildi. Lütfen biraz sonra tekrar deneyin." }, { status: 429 });
    }

    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return NextResponse.json({ error: getErrorMessage(locale, "missing") }, { status: 400 });
    }

    locale = normalizeLocale(formData.get("locale"));
    const audio = formData.get("audio");

    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: getErrorMessage(locale, "missing") }, { status: 400 });
    }

    if (audio.size > maxAudioSizeBytes) {
      return NextResponse.json({ error: getErrorMessage(locale, "size") }, { status: 413 });
    }

    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: getErrorMessage(locale, "config") }, { status: 500 });
    }

    const openAiForm = new FormData();
    openAiForm.append("file", audio, audio.name || "question.webm");
    openAiForm.append("model", process.env.OPENAI_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe");
    openAiForm.append("language", locale);
    openAiForm.append(
      "prompt",
      locale === "tr"
        ? "Bu ses kaydı Enbilir piyasa sohbetinde Türkçe bir finans/piyasa sorusudur. Metni sade ve doğru şekilde yazıya çevir."
        : "This recording is a finance/market question for the Enbilir market chat. Transcribe it clearly and accurately.",
    );

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: openAiForm,
    });

    const payload = await response.json() as { text?: unknown; error?: { message?: unknown } };

    if (!response.ok || typeof payload.text !== "string" || !payload.text.trim()) {
      const apiMessage = typeof payload.error?.message === "string" ? payload.error.message : null;
      return NextResponse.json({ error: apiMessage || getErrorMessage(locale, "failed") }, { status: 502 });
    }

    return NextResponse.json({ text: payload.text.trim().slice(0, 700) });
  } catch (error) {
    return NextResponse.json(
      {
        error: process.env.NODE_ENV === "production"
          ? getErrorMessage(locale, "failed")
          : error instanceof Error ? error.message : getErrorMessage(locale, "failed"),
      },
      { status: 500 },
    );
  }
}
