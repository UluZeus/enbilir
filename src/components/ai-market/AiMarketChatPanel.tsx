"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { getSafeLocale, type Locale } from "@/i18n/config";

type AiMarketChatPanelProps = {
  locale: Locale | string;
  membershipTier?: "STANDARD" | "VIP";
  vipPaidUntil?: string | null;
  standardPaymentLink?: string;
  vipPaymentLink?: string;
};

type ChatRole = "assistant" | "user";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ChatSource = {
  label: string;
  value: string;
};

type ChatResponse = {
  answer?: string;
  error?: string;
  mode?: "openai" | "local";
  membership?: "STANDARD" | "VIP";
  updatedAt?: string;
  sources?: ChatSource[];
};

type TranscribeResponse = {
  text?: string;
  error?: string;
};

const quickPrompts = {
  tr: [
    "Bugün piyasa genel olarak nasıl?",
    "Bitcoin ve Ethereum ne durumda?",
    "En çok yükselenler ve düşenler hangileri?",
    "Altın, gümüş ve dolar tarafında resim nasıl?",
  ],
  en: [
    "How does the market look today?",
    "What is happening with Bitcoin and Ethereum?",
    "Which assets are rising and falling most?",
    "How do gold, silver, and the dollar look?",
  ],
} as const;

const copy = {
  tr: {
    kicker: "Canlı veri sohbeti",
    title: "AI Robot ile piyasa verisini konuş",
    intro:
      "Merhaba, ben Enbilir AI Piyasa Robotu. Yanıtlarımı bu sitedeki canlı/cache piyasa verileri, AI Asistan ekranı ve sitedeki makro bağlam üzerinden veririm. Harici haber taraması yapmam; sadece sitedeki piyasa ve eğitim konularında yardımcı olurum. Yazdıklarım yatırım tavsiyesi değildir.",
    vipIntro:
      "Merhaba, ben Enbilir VIP AI Piyasa Robotu. Yanıtlarımı sitedeki canlı/cache piyasa verileri, AI Asistan ekranı, sitedeki makro bağlam ve ücretsiz public haber/veri başlıkları üzerinden üretirim. Yine de doğrulanmamış bilgi uydurmam; yazdıklarım yatırım tavsiyesi değildir.",
    placeholder: "Örn: Bitcoin bugün güçlü mü, altın tarafında ne görüyorsun?",
    send: "Gönder",
    thinking: "Veriyi okuyorum...",
    empty: "Bir piyasa sorusu yazın.",
    failure: "Sohbet yanıtı alınamadı. Lütfen biraz sonra tekrar deneyin.",
    sourceTitle: "Kullanılan site verisi",
    localMode: "Yerel veri yorumu",
    aiMode: "AI yorum",
    standardTier: "Standart",
    vipTier: "VIP",
    standardTitle: "Standart AI sohbet",
    standardBody: "Sitedeki canlı/cache piyasa verileriyle sınırlıdır. Gönüllü standart katkı aylık 70 TL'dir.",
    vipTitle: "VIP AI sohbet",
    vipBody: "Sitedeki veriye ek olarak ücretsiz public haber/veri başlıklarıyla daha üst seviye yorum üretir. VIP üyelik aylık 100 TL'dir.",
    standardPay: "70 TL katkı linki",
    vipPay: "100 TL VIP linki",
    note: "Sohbet, Enbilir içindeki canlı/cache veriyi yorumlar; dış haber veya yatırım emri üretmez.",
    voiceTitle: "Sesli AI sohbet",
    voiceStart: "Mikrofonla sor",
    voiceStop: "Durdur",
    voiceListening: "Dinliyorum...",
    voiceProcessing: "Sesi yazıya çeviriyorum...",
    voiceUnsupported: "Bu tarayıcı ses kaydını desteklemiyor. Chrome, Edge veya güncel Safari ile deneyin.",
    voicePermissionDenied: "Mikrofon izni kapalı görünüyor. Adres çubuğundaki kilit simgesinden mikrofon iznini bu site için 'İzin ver' yapıp sayfayı yenileyin.",
    voiceNoSpeech: "Ses algılanamadı. Mikrofon açıkken biraz daha yakından ve net konuşarak tekrar deneyin.",
    voiceNetworkError: "Ses yazıya çevrilemedi. İnternet bağlantısını kontrol edip tekrar deneyin.",
    voiceHint: "Konuşmayı bitirince Durdur'a basın; yazıya çevrilip sohbete soru olarak eklenecek.",
    voiceSpeakOn: "Sesli yanıt açık",
    voiceSpeakOff: "Sesli yanıt kapalı",
    voiceReplay: "Son yanıtı oku",
  },
  en: {
    kicker: "Live data chat",
    title: "Talk with the AI Robot",
    intro:
      "Hello, I am the Enbilir AI Market Robot. I answer from this site's live/cache market data, the AI Assistant screen, and internal macro context. I do not browse external news; I only help with market and education topics inside the site. Nothing here is investment advice.",
    vipIntro:
      "Hello, I am the Enbilir VIP AI Market Robot. I answer from this site's live/cache market data, the AI Assistant screen, internal macro context, and free public news/data headlines. I still do not invent unverified facts; nothing here is investment advice.",
    placeholder: "Example: Is Bitcoin strong today, what do you see in gold?",
    send: "Send",
    thinking: "Reading site data...",
    empty: "Enter a market question.",
    failure: "Chat response could not be loaded. Please try again shortly.",
    sourceTitle: "Site data used",
    localMode: "Local data read",
    aiMode: "AI read",
    standardTier: "Standard",
    vipTier: "VIP",
    standardTitle: "Standard AI chat",
    standardBody: "Limited to the site's live/cache market data. The voluntary standard contribution is 70 TL/month.",
    vipTitle: "VIP AI chat",
    vipBody: "Adds free public news/data headlines to the site data for a higher-level read. VIP membership is 100 TL/month.",
    standardPay: "70 TL contribution link",
    vipPay: "100 TL VIP link",
    note: "The chat interprets Enbilir live/cache data only; it does not create external news or trade orders.",
    voiceTitle: "Voice AI chat",
    voiceStart: "Ask by voice",
    voiceStop: "Stop",
    voiceListening: "Listening...",
    voiceProcessing: "Transcribing your voice...",
    voiceUnsupported: "This browser does not support audio recording. Try Chrome, Edge, or a current Safari version.",
    voicePermissionDenied: "Microphone permission appears to be blocked. Use the lock icon in the address bar, allow microphone access for this site, then refresh the page.",
    voiceNoSpeech: "No speech was detected. Try again with the microphone enabled and speak a little closer and clearer.",
    voiceNetworkError: "Voice transcription could not be completed. Check your connection and try again.",
    voiceHint: "Press Stop when you finish speaking; it will be transcribed and sent as a chat question.",
    voiceSpeakOn: "Voice answer on",
    voiceSpeakOff: "Voice answer off",
    voiceReplay: "Read last answer",
  },
} as const;

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatMessage(content: string) {
  return content.split(/\n{2,}/).map((paragraph) => paragraph.trim()).filter(Boolean);
}

function browserSupportsVoiceRecording() {
  if (typeof window === "undefined") {
    return false;
  }

  return Boolean(navigator.mediaDevices && "getUserMedia" in navigator.mediaDevices && "MediaRecorder" in window);
}

function getPreferredAudioMimeType() {
  if (typeof window === "undefined" || !("MediaRecorder" in window)) {
    return "";
  }

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];

  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function stopMicrophonePreview(stream: MediaStream) {
  stream.getTracks().forEach((track) => track.stop());
}

export function AiMarketChatPanel({
  locale,
  membershipTier = "STANDARD",
  vipPaidUntil,
  standardPaymentLink,
  vipPaymentLink,
}: AiMarketChatPanelProps) {
  const safeLocale = getSafeLocale(locale);
  const text = copy[safeLocale];
  const prompts = quickPrompts[safeLocale];
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "intro", role: "assistant", content: membershipTier === "VIP" ? text.vipIntro : text.intro },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sources, setSources] = useState<ChatSource[]>([]);
  const [mode, setMode] = useState<"openai" | "local" | null>(null);
  const [effectiveTier, setEffectiveTier] = useState<"STANDARD" | "VIP">(membershipTier);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceTranscript, setVoiceTranscript] = useState("");
  const [speakAnswers, setSpeakAnswers] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastAnswer, setLastAnswer] = useState("");
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const [voiceSupported, setVoiceSupported] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVoiceSupported(browserSupportsVoiceRecording());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => () => {
    if (recordingTimerRef.current) {
      window.clearTimeout(recordingTimerRef.current);
    }
    mediaRecorderRef.current?.stop();
    if (mediaStreamRef.current) {
      stopMicrophonePreview(mediaStreamRef.current);
    }
  }, []);

  const history = useMemo(
    () => messages
      .filter((message) => message.id !== "intro")
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  function speak(textToRead: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !textToRead.trim()) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textToRead);
    utterance.lang = safeLocale === "tr" ? "tr-TR" : "en-US";
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  }

  async function ask(question: string, options?: { speakAnswer?: boolean }) {
    const cleanQuestion = question.replace(/\s+/g, " ").trim();

    if (!cleanQuestion || isSending) {
      setError(text.empty);
      return;
    }

    const userMessage: ChatMessage = { id: newId("user"), role: "user", content: cleanQuestion };
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setIsSending(true);

    try {
      const response = await fetch("/api/ai-market/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ message: cleanQuestion, locale: safeLocale, history }),
      });
      const payload = await response.json() as ChatResponse;

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || text.failure);
      }

      setMessages((current) => [...current, { id: newId("assistant"), role: "assistant", content: payload.answer ?? "" }]);
      setLastAnswer(payload.answer ?? "");
      setSources(payload.sources ?? []);
      setMode(payload.mode ?? null);
      setEffectiveTier(payload.membership ?? membershipTier);
      if (options?.speakAnswer && speakAnswers) {
        speak(payload.answer ?? "");
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : text.failure;
      setError(message);
      setMessages((current) => [...current, { id: newId("assistant-error"), role: "assistant", content: message }]);
    } finally {
      setIsSending(false);
      window.setTimeout(() => inputRef.current?.focus(), 0);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void ask(input);
  }

  async function requestMicrophoneAccess() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return null;
    }

    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setVoiceError(text.voicePermissionDenied);
      return null;
    }
  }

  async function startVoiceQuestion() {
    if (!voiceSupported) {
      setVoiceError(text.voiceUnsupported);
      return;
    }

    if (isListening) {
      mediaRecorderRef.current?.stop();
      return;
    }

    setVoiceError(null);
    setVoiceTranscript("");
    audioChunksRef.current = [];

    const stream = await requestMicrophoneAccess();

    if (!stream) {
      return;
    }

    const mimeType = getPreferredAudioMimeType();
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    mediaStreamRef.current = stream;
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunksRef.current.push(event.data);
      }
    };

    recorder.onerror = () => {
      setVoiceError(text.voiceNetworkError);
      setIsListening(false);
      setIsTranscribing(false);
      stopMicrophonePreview(stream);
    };

    recorder.onstop = () => {
      if (recordingTimerRef.current) {
        window.clearTimeout(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      const chunks = audioChunksRef.current;
      const recordedType = recorder.mimeType || mimeType || "audio/webm";
      const audioBlob = new Blob(chunks, { type: recordedType });
      stopMicrophonePreview(stream);
      mediaStreamRef.current = null;
      mediaRecorderRef.current = null;
      setIsListening(false);

      if (audioBlob.size < 1200) {
        setVoiceError(text.voiceNoSpeech);
        return;
      }

      void transcribeAndAsk(audioBlob, recordedType);
    };

    try {
      recorder.start();
      setIsListening(true);
      recordingTimerRef.current = window.setTimeout(() => {
        if (mediaRecorderRef.current?.state === "recording") {
          mediaRecorderRef.current.stop();
        }
      }, 15_000);
    } catch {
      stopMicrophonePreview(stream);
      setVoiceError(text.voicePermissionDenied);
      setIsListening(false);
    }
  }

  async function transcribeAndAsk(audioBlob: Blob, mimeType: string) {
    setIsTranscribing(true);
    setVoiceError(null);

    try {
      const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("mpeg") ? "mp3" : "webm";
      const formData = new FormData();
      formData.append("locale", safeLocale);
      formData.append("audio", audioBlob, `question.${extension}`);

      const response = await fetch("/api/ai-market/transcribe", {
        method: "POST",
        body: formData,
      });
      const payload = await response.json() as TranscribeResponse;
      const transcript = payload.text?.replace(/\s+/g, " ").trim() ?? "";

      if (!response.ok || !transcript) {
        throw new Error(payload.error || text.voiceNetworkError);
      }

      setVoiceTranscript(transcript);
      setInput(transcript);
      await ask(transcript, { speakAnswer: true });
    } catch (transcribeError) {
      setVoiceError(transcribeError instanceof Error ? transcribeError.message : text.voiceNetworkError);
    } finally {
      setIsTranscribing(false);
    }
  }

  return (
    <section className="ai-market-chat-panel mx-auto mb-4 max-w-[1600px] rounded-[1.25rem] border border-slate-800 bg-[#08111f] p-3 text-white shadow-2xl md:p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="min-w-0">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.16em] text-cyan-200">{text.kicker}</p>
              <h2 className="mt-1 text-xl font-black text-white md:text-2xl">{text.title}</h2>
            </div>
            <span className="w-fit rounded-md border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-[11px] font-black uppercase tracking-[0.12em] text-cyan-100">
              {effectiveTier === "VIP" ? text.vipTier : text.standardTier} · {mode === "openai" ? text.aiMode : text.localMode}
            </span>
          </div>

          <div className="mt-4 max-h-[420px] overflow-y-auto rounded-md border border-slate-800 bg-slate-950/65 p-3">
            <div className="grid gap-3">
              {messages.map((message) => (
                <article
                  key={message.id}
                  className={`max-w-[92%] rounded-md border px-3 py-2 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto border-cyan-300/20 bg-cyan-300/10 text-cyan-50"
                      : "border-slate-700 bg-slate-900 text-slate-100"
                  }`}
                >
                  {formatMessage(message.content).map((paragraph) => (
                    <p key={paragraph} className="mb-2 last:mb-0 whitespace-pre-wrap">{paragraph}</p>
                  ))}
                </article>
              ))}
              {isSending ? (
                <div className="w-fit rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-bold text-amber-100">
                  {text.thinking}
                </div>
              ) : null}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="mt-3 grid gap-2 md:grid-cols-[minmax(0,1fr)_110px]">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              rows={2}
              maxLength={700}
              placeholder={text.placeholder}
              className="min-h-[64px] resize-none rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white outline-none transition focus:border-cyan-300"
            />
            <button
              type="submit"
              disabled={isSending}
              className="rounded-md border border-cyan-200 bg-cyan-100 px-4 py-2 text-sm font-black text-slate-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
            >
              {isSending ? "..." : text.send}
            </button>
          </form>
          {error ? <p className="mt-2 text-xs font-bold text-rose-200">{error}</p> : null}
          <div className="mt-3 rounded-md border border-cyan-300/16 bg-cyan-300/8 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">{text.voiceTitle}</p>
              <button
                type="button"
                onClick={() => setSpeakAnswers((current) => !current)}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/15"
              >
                {speakAnswers ? text.voiceSpeakOn : text.voiceSpeakOff}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void startVoiceQuestion()}
                disabled={!voiceSupported || isSending || isTranscribing}
                className={`rounded-md px-4 py-2 text-sm font-black ${
                  isListening
                    ? "border border-rose-200 bg-rose-100 text-rose-800"
                    : "border border-cyan-200 bg-cyan-100 text-slate-950"
                } disabled:cursor-not-allowed disabled:opacity-55`}
              >
                {isListening ? text.voiceStop : text.voiceStart}
              </button>
              <button
                type="button"
                onClick={() => speak(lastAnswer)}
                disabled={!lastAnswer || isSpeaking}
                className="rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSpeaking ? "..." : text.voiceReplay}
              </button>
            </div>
            {isListening ? <p className="mt-2 text-xs font-bold text-cyan-100">{text.voiceListening}</p> : null}
            {isTranscribing ? <p className="mt-2 text-xs font-bold text-cyan-100">{text.voiceProcessing}</p> : null}
            {!isListening && !isTranscribing && voiceSupported ? <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">{text.voiceHint}</p> : null}
            {voiceTranscript ? <p className="mt-2 text-xs font-semibold leading-5 text-slate-200">{voiceTranscript}</p> : null}
            {voiceError || !voiceSupported ? (
              <p className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold leading-5 text-amber-100">
                {voiceError ?? text.voiceUnsupported}
              </p>
            ) : null}
          </div>
        </div>

        <aside className="grid content-start gap-3 rounded-md border border-slate-800 bg-slate-950/45 p-3">
          <div className={`rounded-md border p-3 ${effectiveTier === "VIP" ? "border-emerald-300/25 bg-emerald-300/10" : "border-cyan-300/20 bg-cyan-300/10"}`}>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-200">
              {effectiveTier === "VIP" ? text.vipTitle : text.standardTitle}
            </p>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-200">
              {effectiveTier === "VIP" ? text.vipBody : text.standardBody}
            </p>
            {effectiveTier === "VIP" && vipPaidUntil ? (
              <p className="mt-2 text-[11px] font-bold text-emerald-100">
                {safeLocale === "tr" ? "VIP bitiş" : "VIP until"}: {new Intl.DateTimeFormat(safeLocale === "tr" ? "tr-TR" : "en-US", { dateStyle: "medium" }).format(new Date(vipPaidUntil))}
              </p>
            ) : null}
            <div className="mt-3 grid gap-2">
              {standardPaymentLink ? (
                <a href={standardPaymentLink} target="_blank" rel="noreferrer" className="rounded-md border border-white/10 bg-white/10 px-3 py-2 text-xs font-black text-white hover:bg-white/15">
                  {text.standardPay}
                </a>
              ) : null}
              {vipPaymentLink ? (
                <a href={vipPaymentLink} target="_blank" rel="noreferrer" className="rounded-md border border-emerald-200 bg-emerald-100 px-3 py-2 text-xs font-black text-slate-950 hover:bg-white">
                  {text.vipPay}
                </a>
              ) : null}
            </div>
          </div>
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-400">{text.sourceTitle}</p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(sources.length > 0
                ? sources
                : safeLocale === "tr"
                  ? [{ label: "Veri", value: "Hazır" }, { label: "Kapsam", value: "Site içi" }]
                  : [{ label: "Data", value: "Ready" }, { label: "Scope", value: "Site context" }]
              ).map((source) => (
                <div key={`${source.label}-${source.value}`} className="rounded-md border border-slate-800 bg-slate-900 px-2.5 py-2">
                  <p className="truncate text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">{source.label}</p>
                  <p className="mt-1 truncate text-xs font-black text-slate-100">{source.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            {prompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => void ask(prompt)}
                disabled={isSending}
                className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-left text-xs font-bold leading-5 text-slate-200 transition hover:border-cyan-300 hover:text-white disabled:cursor-not-allowed disabled:opacity-55"
              >
                {prompt}
              </button>
            ))}
          </div>

          <p className="rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-semibold leading-5 text-amber-100">
            {text.note}
          </p>
        </aside>
      </div>
    </section>
  );
}
