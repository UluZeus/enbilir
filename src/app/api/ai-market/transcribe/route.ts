import { NextResponse } from "next/server";
import { FixedWindowRateLimiter, getRateLimitClientKey } from "@/lib/request-rate-limit";

export const dynamic = "force-dynamic";

const maxAudioSizeBytes = 8 * 1024 * 1024;
const allowedAudioTypes = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/mp3",
  "audio/m4a",
  "audio/wav",
  "audio/x-wav",
]);
const rateLimiter = new FixedWindowRateLimiter({
  windowMs: 60_000,
  maxRequests: 12,
  maxEntries: 10_000,
});

function normalizeLocale(value: FormDataEntryValue | null) {
  return value === "en" ? "en" : "tr";
}

function getErrorMessage(locale: "tr" | "en", key: "missing" | "size" | "type" | "config" | "failed") {
  const messages = {
    tr: {
      missing: "Ses kaydı alınamadı. Lütfen tekrar deneyin.",
      size: "Ses kaydı çok büyük. Daha kısa bir soru sorun.",
      type: "Ses dosyası biçimi desteklenmiyor. WebM, MP4, MP3, M4A veya WAV kullanın.",
      config: "Ses çözümleme servisi yapılandırılmamış. OPENAI_API_KEY gerekli.",
      failed: "Ses yazıya çevrilemedi. Lütfen tekrar deneyin.",
    },
    en: {
      missing: "No audio recording was received. Please try again.",
      size: "The audio recording is too large. Please ask a shorter question.",
      type: "This audio format is not supported. Use WebM, MP4, MP3, M4A, or WAV.",
      config: "Voice transcription is not configured. OPENAI_API_KEY is required.",
      failed: "Voice could not be transcribed. Please try again.",
    },
  };

  return messages[locale][key];
}

export async function POST(request: Request) {
  let locale: "tr" | "en" = "tr";

  try {
    const clientKey = getRateLimitClientKey(request.headers);

    if (rateLimiter.isRateLimited(clientKey)) {
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

    const audioType = audio.type.toLowerCase().split(";", 1)[0];

    if (!allowedAudioTypes.has(audioType)) {
      return NextResponse.json({ error: getErrorMessage(locale, "type") }, { status: 415 });
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
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]),
    });

    const payload = await response.json() as { text?: unknown; error?: { message?: unknown } };

    if (!response.ok || typeof payload.text !== "string" || !payload.text.trim()) {
      const apiMessage = typeof payload.error?.message === "string" ? payload.error.message : null;
      return NextResponse.json({
        error: process.env.NODE_ENV === "production" ? getErrorMessage(locale, "failed") : apiMessage || getErrorMessage(locale, "failed"),
      }, { status: 502 });
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
