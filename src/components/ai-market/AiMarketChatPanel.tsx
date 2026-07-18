"use client";

import { FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
  citations?: ChatCitation[];
};

type ChatCitation = {
  title: string;
  url: string;
  startIndex: number;
  endIndex: number;
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
  citations?: ChatCitation[];
  researchStatus?: "completed" | "unavailable" | "site_only";
};

type TranscribeResponse = {
  text?: string;
  error?: string;
};

const quickPrompts = {
  tr: [
    "Bugün en güçlü asimetrik fırsat hangisi; kanıt açığını da yaz.",
    "Bitcoin için makro, 50/200 ortalama ve RSI/MACD resmi nasıl?",
    "Olumlu verilere rağmen uzak durmam gereken varlık var mı?",
    "Bir fikir için giriş, geçersizleşme, stop ve hedef karnesi hazırla.",
  ],
  en: [
    "What is today's strongest asymmetric opportunity, including evidence gaps?",
    "How do Bitcoin's macro, 50/200 averages, and RSI/MACD picture look?",
    "Which asset should I avoid despite otherwise positive data?",
    "Build an entry, invalidation, stop, target, and scorecard for one idea.",
  ],
} as const;

const copy = {
  tr: {
    kicker: "Canlı veri sohbeti",
    title: "AI Robot ile piyasa verisini konuş",
    intro:
      "Merhaba, ben Enbilir'in kurumsal karar-destek yapay zekâsıyım. Popülerlik yerine asimetrik risk/getiri, temel kanıt, kurumsal teknik yapı, olumsuz tez ve objektif kaçış planı ararım. Standart kapsamda yalnız Enbilir'in site içi ve zaman damgalı verilerini kullanırım; eksik kanıtı uydurmam.",
    vipIntro:
      "Merhaba, ben Enbilir VIP kurumsal karar-destek yapay zekâsıyım. Site içi kanıtı güncel internet araştırmasıyla birleştirir; temel, 50/200 ortalama, hacim, RSI/MACD, 3-12 aylık katalizör, olumsuz tez ve kaçış planını birlikte incelerim. Kaynaksız rakam veya sahte kesinlik üretmem.",
    placeholder: "Örn: AAPL için iki ayaklı tez, olumsuz senaryo ve kaçış planı hazırla.",
    send: "Gönder",
    thinking: "Site içindeki piyasa verilerini ve raporları karşılaştırıyorum; bu biraz sürebilir.",
    vipThinking: "Güncel internet ve site kaynaklarını doğruluyorum; bu biraz sürebilir.",
    waiting: "Bunu dikkatle değerlendirmek için biraz daha düşünmem gerekiyor; seni biraz bekleteceğim.",
    synthesizing: "Makro, temel ve kurumsal teknik kanıtları tek bir tezde birleştiriyorum.",
    researchUnavailable: "Canlı internet araştırması bu turda tamamlanamadı; yanıt yalnız site içi kanıtla sınırlandı.",
    empty: "Bir piyasa sorusu yazın.",
    failure: "Sohbet yanıtı alınamadı. Lütfen biraz sonra tekrar deneyin.",
    sourceTitle: "Kullanılan kanıt",
    citationTitle: "Tıklanabilir web kaynakları",
    localMode: "Yerel veri yorumu",
    aiMode: "AI yorum",
    standardTier: "Standart",
    vipTier: "VIP",
    standardTitle: "Standart AI sohbet",
    standardBody: "Kurumsal analiz metodolojisi site içindeki veri ve raporlarla sınırlıdır. Gönüllü standart katkı aylık 70 TL'dir.",
    vipTitle: "VIP AI sohbet",
    vipBody: "Site içi kanıta güncel, kaynaklı internet araştırması ve özel VIP araştırma bağlamını ekler. VIP üyelik aylık 100 TL'dir.",
    standardPay: "70 TL katkı linki",
    vipPay: "100 TL VIP linki",
    note: "Her yanıt yatırım tavsiyesi değildir; nihai karar kullanıcıya aittir. Analiz, Dr. Hakan Ünsal tarafından eğitilmiş Enbilir yapay zekâsı tarafından üretilir.",
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
    voiceStopSpeaking: "Sesli okumayı durdur",
  },
  en: {
    kicker: "Live data chat",
    title: "Talk with the AI Robot",
    intro:
      "Hello, I am Enbilir's institutional decision-support AI. I look beyond popularity for asymmetric risk/reward, fundamental evidence, institutional technical structure, a negative thesis, and an objective escape plan. Standard scope uses only timestamped evidence inside Enbilir and never invents missing data.",
    vipIntro:
      "Hello, I am Enbilir's VIP institutional decision-support AI. I combine site evidence with current web research and examine fundamentals, 50/200 averages, volume, RSI/MACD, 3-12 month catalysts, the negative case, and an escape plan. I do not invent unsourced figures or false certainty.",
    placeholder: "Example: Build a two-leg AAPL thesis, negative case, and escape plan.",
    send: "Send",
    thinking: "Comparing Enbilir's internal market data and reports; this may take a moment.",
    vipThinking: "Verifying current web and site sources; this may take a moment.",
    waiting: "I need a little more time to assess this carefully; thank you for waiting.",
    synthesizing: "Combining the macro, fundamental, and institutional technical evidence.",
    researchUnavailable: "Live web research could not be completed in this turn; the answer was limited to site evidence.",
    empty: "Enter a market question.",
    failure: "Chat response could not be loaded. Please try again shortly.",
    sourceTitle: "Evidence used",
    citationTitle: "Clickable web sources",
    localMode: "Local data read",
    aiMode: "AI read",
    standardTier: "Standard",
    vipTier: "VIP",
    standardTitle: "Standard AI chat",
    standardBody: "The institutional methodology is limited to evidence and reports inside the site. The voluntary standard contribution is 70 TL/month.",
    vipTitle: "VIP AI chat",
    vipBody: "Adds current cited web research and private VIP research context to site evidence. VIP membership is 100 TL/month.",
    standardPay: "70 TL contribution link",
    vipPay: "100 TL VIP link",
    note: "Every response is not investment advice; the final decision belongs to the user. Analysis is generated by Enbilir AI trained by Dr. Hakan Unsal.",
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
    voiceStopSpeaking: "Stop reading",
  },
} as const;

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeCitations(content: string, citations: ChatCitation[] | undefined) {
  return (citations ?? [])
    .filter((citation) => {
      try {
        const url = new URL(citation.url);
        return url.protocol === "https:"
          && Number.isInteger(citation.startIndex)
          && Number.isInteger(citation.endIndex)
          && citation.startIndex >= 0
          && citation.endIndex > citation.startIndex
          && citation.endIndex <= content.length;
      } catch {
        return false;
      }
    })
    .sort((left, right) => left.startIndex - right.startIndex || left.endIndex - right.endIndex)
    .filter((citation, index, all) => index === 0 || citation.startIndex >= all[index - 1].endIndex);
}

function renderMessageContent(message: ChatMessage): ReactNode {
  const citations = normalizeCitations(message.content, message.citations);

  if (citations.length === 0) {
    return message.content;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  citations.forEach((citation, index) => {
    if (citation.startIndex > cursor) {
      nodes.push(message.content.slice(cursor, citation.startIndex));
    }

    nodes.push(
      <a
        key={`${citation.url}-${citation.startIndex}-${index}`}
        href={citation.url}
        target="_blank"
        rel="noreferrer"
        title={citation.title}
        className="font-black text-cyan-200 underline decoration-cyan-400/60 underline-offset-2 hover:text-white"
      >
        {message.content.slice(citation.startIndex, citation.endIndex)}
      </a>,
    );
    cursor = citation.endIndex;
  });

  if (cursor < message.content.length) {
    nodes.push(message.content.slice(cursor));
  }

  return nodes;
}

function uniqueCitationSources(citations: ChatCitation[] | undefined) {
  const sources = new Map<string, ChatCitation>();

  for (const citation of citations ?? []) {
    try {
      const url = new URL(citation.url);

      if (url.protocol === "https:" && !sources.has(url.toString())) {
        sources.set(url.toString(), { ...citation, url: url.toString() });
      }
    } catch {
      continue;
    }
  }

  return Array.from(sources.values()).slice(0, 12);
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
  const [progressText, setProgressText] = useState<string | null>(null);
  const [researchNotice, setResearchNotice] = useState<string | null>(null);
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
  const voiceStartInFlightRef = useRef(false);
  const isMountedRef = useRef(true);
  const progressTimersRef = useRef<number[]>([]);
  const chatAbortControllerRef = useRef<AbortController | null>(null);
  const transcriptionAbortControllerRef = useRef<AbortController | null>(null);
  const [voiceSupported, setVoiceSupported] = useState<boolean | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setVoiceSupported(browserSupportsVoiceRecording());
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      voiceStartInFlightRef.current = false;
      if (recordingTimerRef.current) {
        window.clearTimeout(recordingTimerRef.current);
      }
      progressTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      chatAbortControllerRef.current?.abort();
      transcriptionAbortControllerRef.current?.abort();
      window.speechSynthesis?.cancel();
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onerror = null;
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      }
      if (mediaStreamRef.current) {
        stopMicrophonePreview(mediaStreamRef.current);
      }
    };
  }, []);

  const history = useMemo(
    () => messages
      .filter((message) => message.id !== "intro")
      .slice(-6)
      .map((message) => ({ role: message.role, content: message.content })),
    [messages],
  );

  function clearProgress() {
    progressTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    progressTimersRef.current = [];
    setProgressText(null);
  }

  function startProgress(tier: "STANDARD" | "VIP") {
    clearProgress();
    setProgressText(tier === "VIP" ? text.vipThinking : text.thinking);
    progressTimersRef.current = [
      window.setTimeout(() => setProgressText(text.waiting), 3_200),
      window.setTimeout(() => setProgressText(text.synthesizing), 8_500),
    ];
  }

  function stopSpeaking() {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }

  function speak(textToRead: string) {
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !textToRead.trim()) {
      return;
    }

    stopSpeaking();
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
    stopSpeaking();
    setMessages((current) => [...current, userMessage]);
    setInput("");
    setError(null);
    setResearchNotice(null);
    setIsSending(true);
    startProgress(effectiveTier);
    const controller = new AbortController();
    chatAbortControllerRef.current = controller;

    try {
      const response = await fetch("/api/ai-market/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ message: cleanQuestion, locale: safeLocale, history }),
        signal: controller.signal,
      });
      const payload = await response.json() as ChatResponse;

      if (!response.ok || !payload.answer) {
        throw new Error(payload.error || text.failure);
      }

      setMessages((current) => [...current, {
        id: newId("assistant"),
        role: "assistant",
        content: payload.answer ?? "",
        citations: payload.citations ?? [],
      }]);
      setLastAnswer(payload.answer ?? "");
      setSources(payload.sources ?? []);
      setMode(payload.mode ?? null);
      setEffectiveTier(payload.membership ?? membershipTier);
      setResearchNotice(payload.membership === "VIP" && payload.researchStatus === "unavailable" ? text.researchUnavailable : null);
      if (options?.speakAnswer && speakAnswers) {
        speak(payload.answer ?? "");
      }
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : text.failure;
      setError(message);
      setMessages((current) => [...current, { id: newId("assistant-error"), role: "assistant", content: message }]);
    } finally {
      if (chatAbortControllerRef.current === controller) {
        chatAbortControllerRef.current = null;
      }
      clearProgress();
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
      if (isMountedRef.current) {
        setVoiceError(text.voicePermissionDenied);
      }
      return null;
    }
  }

  async function startVoiceQuestion() {
    if (!voiceSupported) {
      setVoiceError(text.voiceUnsupported);
      return;
    }

    const activeRecorder = mediaRecorderRef.current;

    if (isListening || activeRecorder) {
      if (activeRecorder?.state === "recording") {
        activeRecorder.stop();
      }
      return;
    }

    if (voiceStartInFlightRef.current) {
      return;
    }

    voiceStartInFlightRef.current = true;
    setVoiceError(null);
    setVoiceTranscript("");
    audioChunksRef.current = [];

    let stream: MediaStream | null = null;

    try {
      stream = await requestMicrophoneAccess();

      if (!stream || !isMountedRef.current) {
        if (stream) {
          stopMicrophonePreview(stream);
        }
        return;
      }

      const activeStream = stream;
      const mimeType = getPreferredAudioMimeType();
      let recorder: MediaRecorder;

      try {
        recorder = new MediaRecorder(activeStream, mimeType ? { mimeType } : undefined);
      } catch {
        stopMicrophonePreview(activeStream);
        setVoiceError(text.voiceUnsupported);
        return;
      }

      let recorderTimer: number | null = null;
      const clearRecorderTimer = () => {
        if (recorderTimer !== null) {
          window.clearTimeout(recorderTimer);
          if (recordingTimerRef.current === recorderTimer) {
            recordingTimerRef.current = null;
          }
          recorderTimer = null;
        }
      };

      mediaStreamRef.current = activeStream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        clearRecorderTimer();
        setVoiceError(text.voiceNetworkError);
        setIsListening(false);
        setIsTranscribing(false);
        stopMicrophonePreview(activeStream);
        if (mediaStreamRef.current === activeStream) {
          mediaStreamRef.current = null;
        }
        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }
      };

      recorder.onstop = () => {
        clearRecorderTimer();

        const chunks = audioChunksRef.current;
        const recordedType = recorder.mimeType || mimeType || "audio/webm";
        const audioBlob = new Blob(chunks, { type: recordedType });
        stopMicrophonePreview(activeStream);
        if (mediaStreamRef.current === activeStream) {
          mediaStreamRef.current = null;
        }
        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }
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
        recorderTimer = window.setTimeout(() => {
          if (recorder.state === "recording") {
            recorder.stop();
          }
        }, 15_000);
        recordingTimerRef.current = recorderTimer;
      } catch {
        clearRecorderTimer();
        stopMicrophonePreview(activeStream);
        if (mediaStreamRef.current === activeStream) {
          mediaStreamRef.current = null;
        }
        if (mediaRecorderRef.current === recorder) {
          mediaRecorderRef.current = null;
        }
        setVoiceError(text.voicePermissionDenied);
        setIsListening(false);
      }
    } finally {
      voiceStartInFlightRef.current = false;
    }
  }

  async function transcribeAndAsk(audioBlob: Blob, mimeType: string) {
    setIsTranscribing(true);
    setVoiceError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 35_000);
    transcriptionAbortControllerRef.current = controller;

    try {
      const extension = mimeType.includes("mp4") ? "mp4" : mimeType.includes("mpeg") ? "mp3" : "webm";
      const formData = new FormData();
      formData.append("locale", safeLocale);
      formData.append("audio", audioBlob, `question.${extension}`);

      const response = await fetch("/api/ai-market/transcribe", {
        method: "POST",
        body: formData,
        signal: controller.signal,
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
      window.clearTimeout(timeoutId);
      if (transcriptionAbortControllerRef.current === controller) {
        transcriptionAbortControllerRef.current = null;
      }
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

          <div
            className="mt-4 max-h-[420px] overflow-y-auto rounded-md border border-slate-800 bg-slate-950/65 p-3"
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            aria-busy={isSending}
          >
            <div className="grid gap-3">
              {messages.map((message) => {
                const citationSources = uniqueCitationSources(message.citations);

                return (
                  <article
                    key={message.id}
                    className={`max-w-[92%] rounded-md border px-3 py-2 text-sm leading-6 ${
                      message.role === "user"
                        ? "ml-auto border-cyan-300/20 bg-cyan-300/10 text-cyan-50"
                        : "border-slate-700 bg-slate-900 text-slate-100"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{renderMessageContent(message)}</p>
                    {citationSources.length > 0 ? (
                      <div className="mt-3 border-t border-slate-700 pt-2">
                        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200">{text.citationTitle}</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {citationSources.map((citation, index) => (
                            <a
                              key={citation.url}
                              href={citation.url}
                              target="_blank"
                              rel="noreferrer"
                              className="max-w-full truncate rounded border border-cyan-300/20 bg-cyan-300/10 px-2 py-1 text-[11px] font-bold text-cyan-100 hover:bg-cyan-300/20"
                            >
                              [{index + 1}] {citation.title}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
              {isSending ? (
                <div role="status" className="w-fit max-w-[92%] rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-sm font-bold leading-6 text-amber-100">
                  {progressText ?? (effectiveTier === "VIP" ? text.vipThinking : text.thinking)}
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
              aria-label={safeLocale === "tr" ? "Piyasa sorunuzu yazın" : "Enter your market question"}
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
          {error ? <p role="alert" className="mt-2 text-xs font-bold text-rose-200">{error}</p> : null}
          {researchNotice ? <p role="status" className="mt-2 rounded-md border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs font-bold leading-5 text-amber-100">{researchNotice}</p> : null}
          <div className="mt-3 rounded-md border border-cyan-300/16 bg-cyan-300/8 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-cyan-100">{text.voiceTitle}</p>
              <button
                type="button"
                onClick={() => setSpeakAnswers((current) => {
                  if (current) {
                    stopSpeaking();
                  }
                  return !current;
                })}
                aria-pressed={speakAnswers}
                className="rounded-md border border-white/10 bg-white/10 px-3 py-1.5 text-xs font-black text-white hover:bg-white/15"
              >
                {speakAnswers ? text.voiceSpeakOn : text.voiceSpeakOff}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => void startVoiceQuestion()}
                disabled={voiceSupported !== true || isSending || isTranscribing}
                aria-pressed={isListening}
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
                onClick={() => isSpeaking ? stopSpeaking() : speak(lastAnswer)}
                disabled={!lastAnswer}
                className="rounded-md border border-white/10 bg-white/10 px-4 py-2 text-sm font-black text-white hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-55"
              >
                {isSpeaking ? text.voiceStopSpeaking : text.voiceReplay}
              </button>
            </div>
            {isListening ? <p className="mt-2 text-xs font-bold text-cyan-100">{text.voiceListening}</p> : null}
            {isTranscribing ? <p className="mt-2 text-xs font-bold text-cyan-100">{text.voiceProcessing}</p> : null}
            {!isListening && !isTranscribing && voiceSupported ? <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">{text.voiceHint}</p> : null}
            {voiceTranscript ? <p className="mt-2 text-xs font-semibold leading-5 text-slate-200">{voiceTranscript}</p> : null}
            {voiceError || voiceSupported === false ? (
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
