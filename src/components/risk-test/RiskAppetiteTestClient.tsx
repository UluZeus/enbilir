"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  calculateAverageScoreForQuestions,
  formatRiskScore,
  getRecommendedNextStepsForLocale,
  getRiskLegalWarningForLocale,
  getRiskProfileForLocale,
  getRiskQuestionsForLocale,
  type RiskProfile,
  type RiskQuestion,
} from "@/data/risk-appetite-test";
import type { Locale } from "@/i18n/config";

type Answers = Record<number, number>;
type RiskDimension = { label: string; score: number; note: string };
type SavedRiskTestState = {
  answers: Answers;
  currentIndex: number;
  started: boolean;
  showConfirmation: boolean;
  showResult: boolean;
};

const storageKey = "enbilir-risk-appetite-test:v2";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RiskTestCopy = {
  questionLabel: string;
  completed: string;
  previous: string;
  restart: string;
  autoAdvanceHint: string;
  confirmKicker: string;
  confirmTitle: string;
  confirmBody: string;
  confirmYes: string;
  confirmNo: string;
  introKicker: string;
  introTitle: string;
  introBody: string;
  introWarning: string;
  start: string;
  introFacts: string[];
  howItWorks: Array<[string, string, string]>;
  questions: string;
  questionNavigatorHint: string;
  scoreLabel: string;
  scoreScale: string;
  low: string;
  high: string;
  summary: string;
  strengths: string;
  behavioralRisks: string;
  awarenessMessage: string;
  portfolioSuggestion: string;
  assetApproach: string;
  assetLabels: [string, string, string, string, string];
  nextSteps: string;
  getReport: string;
  pdf: string;
  pdfHint: string;
  emailTitle: string;
  emailLabel: string;
  emailPlaceholder: string;
  emailButton: string;
  emailSending: string;
  emailPrivacy: string;
  invalidEmail: string;
  emailError: string;
  emailSentFallback: string;
  printTitle: string;
  dimensionsTitle: string;
  dimensionLabels: [string, string, string, string];
  dimensionNote: string;
};

const copyByLocale: Record<Locale, RiskTestCopy> = {
  tr: {
    questionLabel: "Soru",
    completed: "Tamamlanan",
    previous: "Önceki Soru",
    restart: "Testi Yeniden Başlat",
    autoAdvanceHint: "Yanıtını seçtiğinde bir sonraki soruya otomatik geçilir.",
    confirmKicker: "Test tamamlandı",
    confirmTitle: "Yanıtların tamam mı?",
    confirmBody: "Onaylarsan risk profilin hesaplanıp yorumlanacak. Onaylamazsan test birinci sorudan yeniden başlayacak.",
    confirmYes: "Evet, sonucu yorumla",
    confirmNo: "Hayır, testi baştan başlat",
    introKicker: "Enbilir farkındalık aracı",
    introTitle: "Risk İştahı Testi",
    introBody: "Piyasalarda nasıl karar verdiğini, belirsizliğe nasıl tepki verdiğini ve sanal portföyünü hangi risk profiliyle yönetmen gerektiğini keşfet.",
    introWarning: "Bu test yatırım tavsiyesi değildir. Amaç, finansal karar alma eğilimlerini tanımana ve sanal portföy deneyimini daha bilinçli kullanmana yardımcı olmaktır.",
    start: "Teste Başla",
    introFacts: ["20 soru", "5 risk seviyesi", "PDF/print raporu", "E-posta özeti"],
    howItWorks: [
      ["1", "Cevapla", "Seçeneğini işaretlediğinde test bir sonraki soruya otomatik geçer."],
      ["2", "Geri dön", "İstediğin soruya geri dönüp cevabını değiştirebilirsin."],
      ["3", "Rapor al", "Ortalama puanına göre risk profili, davranışsal riskler ve sanal portföy önerileri gösterilir."],
    ],
    questions: "Sorular",
    questionNavigatorHint: "Soruları gözden geçir",
    scoreLabel: "Ortalama puan",
    scoreScale: "1.00 düşük, 5.00 yüksek risk iştahı",
    low: "Çok düşük",
    high: "Çok yüksek",
    summary: "Kısa özet",
    strengths: "Güçlü yönler",
    behavioralRisks: "Davranışsal riskler",
    awarenessMessage: "Bu sonuç sana ne yapman gerektiğini söylemez; nasıl karar verdiğini fark etmeni sağlar.",
    portfolioSuggestion: "Sanal portföy kullanım önerisi",
    assetApproach: "Varlık türlerine yaklaşım notu",
    assetLabels: ["Borsa", "Döviz / dolar", "Altın", "Kripto para", "Nakit / düşük riskli alanlar"],
    nextSteps: "Enbilir içinde önerilen sonraki adımlar",
    getReport: "Raporu al",
    pdf: "PDF Olarak İndir",
    pdfHint: "PDF butonu tarayıcının yazdırma ekranını açar; hedef olarak PDF kaydet seçilebilir.",
    emailTitle: "Raporu E-Postama Gönder",
    emailLabel: "Raporun gönderileceği e-posta adresi",
    emailPlaceholder: "ornek@eposta.com",
    emailButton: "Raporu E-Postama Gönder",
    emailSending: "Gönderiliyor...",
    emailPrivacy: "E-posta adresiniz yalnızca bu raporu göndermek için kullanılır; açık rızanız olmadan pazarlama amacıyla saklanmaz.",
    invalidEmail: "Lütfen geçerli bir e-posta adresi gir.",
    emailError: "Rapor gönderilemedi.",
    emailSentFallback: "Rapor özeti e-posta adresine gönderildi.",
    printTitle: "Enbilir Risk İştahı Testi",
    dimensionsTitle: "Yanıtlarının dört davranışsal görünümü",
    dimensionLabels: ["Vade", "Kayıp tepkisi", "Çeşitlendirme", "Risk toleransı"],
    dimensionNote: "Eğitsel gruplama · 1 düşük · 5 yüksek",
  },
  en: {
    questionLabel: "Question",
    completed: "Completed",
    previous: "Previous Question",
    restart: "Restart Test",
    autoAdvanceHint: "Choosing an answer automatically moves you to the next question.",
    confirmKicker: "Test complete",
    confirmTitle: "Are your answers complete?",
    confirmBody: "If you confirm, your risk profile will be calculated and interpreted. Otherwise, the test will restart from question one.",
    confirmYes: "Yes, interpret my result",
    confirmNo: "No, restart the test",
    introKicker: "Enbilir awareness tool",
    introTitle: "Risk Appetite Test",
    introBody: "Discover how you make decisions in markets, how you react to uncertainty, and which risk profile can guide your virtual portfolio practice.",
    introWarning: "This test is not investment advice. Its purpose is to help you understand your financial decision tendencies and use the virtual portfolio experience more consciously.",
    start: "Start Test",
    introFacts: ["20 questions", "5 risk levels", "PDF/print report", "Email summary"],
    howItWorks: [
      ["1", "Answer", "Choose an option and the test automatically moves to the next question."],
      ["2", "Go back", "You can return to any question and change your answer."],
      ["3", "Get report", "Your average score becomes a risk profile with behavioral risks and virtual portfolio suggestions."],
    ],
    questions: "Questions",
    questionNavigatorHint: "Review questions",
    scoreLabel: "Average score",
    scoreScale: "1.00 low, 5.00 high risk appetite",
    low: "Very low",
    high: "Very high",
    summary: "Short summary",
    strengths: "Strengths",
    behavioralRisks: "Behavioral risks",
    awarenessMessage: "This result does not tell you what to do; it helps you notice how you make decisions.",
    portfolioSuggestion: "Virtual portfolio suggestion",
    assetApproach: "Asset-class approach notes",
    assetLabels: ["Stocks", "FX / dollar", "Gold", "Cryptocurrency", "Cash / lower-risk areas"],
    nextSteps: "Recommended next steps in Enbilir",
    getReport: "Get report",
    pdf: "Download as PDF",
    pdfHint: "The PDF button opens your browser print screen; choose Save as PDF as the destination.",
    emailTitle: "Send Report to My Email",
    emailLabel: "Email address for the report",
    emailPlaceholder: "name@email.com",
    emailButton: "Send Report to My Email",
    emailSending: "Sending...",
    emailPrivacy: "Your email address is used only to send this report; it is not stored for marketing without your explicit consent.",
    invalidEmail: "Please enter a valid email address.",
    emailError: "The report could not be sent.",
    emailSentFallback: "The report summary was sent to your email address.",
    printTitle: "Enbilir Risk Appetite Test",
    dimensionsTitle: "Four behavioral views of your answers",
    dimensionLabels: ["Time horizon", "Loss response", "Diversification", "Risk tolerance"],
    dimensionNote: "Educational grouping · 1 low · 5 high",
  },
};

function averageDimensionScore(questions: RiskQuestion[], answers: Answers, questionIds: ReadonlySet<number>, fallback: number) {
  const scores = questions
    .filter((question) => questionIds.has(question.id))
    .map((question) => answers[question.id])
    .filter((score): score is number => Number.isFinite(score));

  return scores.length > 0 ? scores.reduce((total, score) => total + score, 0) / scores.length : fallback;
}

function buildRiskDimensions(questions: RiskQuestion[], answers: Answers, locale: Locale, fallback: number): RiskDimension[] {
  const labels = copyByLocale[locale].dimensionLabels;
  // The active 20-question set is partitioned exactly once across these four
  // educational lenses. Stable question IDs avoid locale-dependent category matching.
  const questionGroups = [
    new Set([3, 14]),
    new Set([2, 10, 12, 16, 32]),
    new Set([5, 9, 17]),
    new Set([1, 6, 8, 11, 13, 18, 20, 21, 27, 35]),
  ];

  return labels.map((label, index) => {
    const score = averageDimensionScore(questions, answers, questionGroups[index], fallback);
    return { label, score, note: `${formatRiskScore(score)} / 5` };
  });
}

function getInitialState(questions: RiskQuestion[], locale: Locale): SavedRiskTestState {
  if (typeof window === "undefined") {
    return { answers: {}, currentIndex: 0, started: false, showConfirmation: false, showResult: false };
  }

  const saved = window.localStorage.getItem(`${storageKey}:${locale}`);
  if (!saved) {
    return { answers: {}, currentIndex: 0, started: false, showConfirmation: false, showResult: false };
  }

  try {
    const parsed = JSON.parse(saved) as Partial<SavedRiskTestState>;
    return {
      answers: parsed.answers ?? {},
      currentIndex: Math.min(Math.max(parsed.currentIndex ?? 0, 0), questions.length - 1),
      started: Boolean(parsed.started),
      showConfirmation: Boolean(parsed.showConfirmation),
      showResult: Boolean(parsed.showResult),
    };
  } catch {
    window.localStorage.removeItem(`${storageKey}:${locale}`);
    return { answers: {}, currentIndex: 0, started: false, showConfirmation: false, showResult: false };
  }
}

export function RiskAppetiteTestClient({ locale, isSignedIn }: { locale: Locale; isSignedIn: boolean }) {
  const copy = copyByLocale[locale];
  const questions = useMemo(() => getRiskQuestionsForLocale(locale), [locale]);
  const legalWarning = getRiskLegalWarningForLocale(locale);
  const recommendedSteps = getRecommendedNextStepsForLocale(locale);
  const [initialState] = useState(() => getInitialState(questions, locale));
  const [started, setStarted] = useState(initialState.started);
  const [currentIndex, setCurrentIndex] = useState(initialState.currentIndex);
  const [answers, setAnswers] = useState<Answers>(initialState.answers);
  const [showConfirmation, setShowConfirmation] = useState(initialState.showConfirmation);
  const [showResult, setShowResult] = useState(initialState.showResult);
  const [isAdvancing, setIsAdvancing] = useState(false);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const questionSectionRef = useRef<HTMLElement>(null);
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const averageScore = useMemo(() => calculateAverageScoreForQuestions(questions, answers), [answers, questions]);
  const profile = averageScore === null ? null : getRiskProfileForLocale(averageScore, locale);
  const riskDimensions = useMemo(
    () => buildRiskDimensions(questions, answers, locale, averageScore ?? 3),
    [answers, averageScore, locale, questions],
  );
  const selectedScore = answers[currentQuestion.id];

  useEffect(() => {
    window.localStorage.setItem(`${storageKey}:${locale}`, JSON.stringify({ answers, currentIndex, started, showConfirmation, showResult }));
  }, [answers, currentIndex, locale, showConfirmation, started, showResult]);

  useEffect(() => () => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
    }
  }, []);

  useEffect(() => {
    if (!started || showConfirmation || showResult) return;
    const frame = window.requestAnimationFrame(() => {
      questionSectionRef.current?.scrollIntoView({ block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [currentIndex, showConfirmation, showResult, started]);

  useEffect(() => {
    if (!isSignedIn || !showResult || !profile || averageScore === null) return;
    const completionKey = `enbilir:onboarding-risk:${profile.key}:${formatRiskScore(averageScore)}`;
    if (window.sessionStorage.getItem(completionKey) === "1") return;
    window.sessionStorage.setItem(completionKey, "1");
    void fetch("/api/onboarding/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step: "risk", score: averageScore, profile: profile.key, locale }),
    });
  }, [averageScore, isSignedIn, locale, profile, showResult]);

  function chooseAnswer(score: number) {
    if (isAdvancing) return;

    const nextAnswers = { ...answers, [currentQuestion.id]: score };
    setAnswers(nextAnswers);
    setIsAdvancing(true);

    advanceTimerRef.current = setTimeout(() => {
      const nextUnansweredIndex = questions.findIndex((question) => !nextAnswers[question.id]);

      if (nextUnansweredIndex === -1) {
        setShowConfirmation(true);
      } else if (currentIndex < questions.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        setCurrentIndex(nextUnansweredIndex);
      }

      setIsAdvancing(false);
      advanceTimerRef.current = null;
    }, 180);
  }

  function previousQuestion() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
    setShowConfirmation(false);
    setShowResult(false);
  }

  function restart() {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
    setAnswers({});
    setCurrentIndex(0);
    setStarted(true);
    setShowConfirmation(false);
    setShowResult(false);
    setIsAdvancing(false);
    setEmail("");
    setEmailStatus("idle");
    setEmailMessage("");
    window.localStorage.removeItem(`${storageKey}:${locale}`);
  }

  function confirmAnswers() {
    if (averageScore === null || !profile) return;
    setShowConfirmation(false);
    setShowResult(true);
  }

  function printReport() {
    window.print();
  }

  async function sendEmailReport() {
    if (!profile || averageScore === null) {
      return;
    }

    if (!emailPattern.test(email.trim())) {
      setEmailStatus("error");
      setEmailMessage(copy.invalidEmail);
      return;
    }

    setEmailStatus("sending");
    setEmailMessage("");

    try {
      const response = await fetch("/api/risk-test/send-report", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          averageScore: formatRiskScore(averageScore),
          profileKey: profile.key,
          locale,
        }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };

      if (!response.ok || !payload.ok) {
        throw new Error(payload.message ?? copy.emailError);
      }

      setEmailStatus("sent");
      setEmailMessage(payload.message ?? copy.emailSentFallback);
    } catch (error) {
      setEmailStatus("error");
      setEmailMessage(error instanceof Error ? error.message : copy.emailError);
    }
  }

  if (!started) {
    return (
      <div className="grid gap-6">
        <IntroPanel copy={copy} onStart={() => setStarted(true)} />
        <HowItWorks copy={copy} />
      </div>
    );
  }

  if (showConfirmation) {
    return <ConfirmationPanel copy={copy} onConfirm={confirmAnswers} onRestart={restart} />;
  }

  if (showResult && profile && averageScore !== null) {
    return (
      <ResultReport
        averageScore={averageScore}
        dimensions={riskDimensions}
        profile={profile}
        email={email}
        emailStatus={emailStatus}
        emailMessage={emailMessage}
        onEmailChange={setEmail}
        onSendEmail={sendEmailReport}
        onPrint={printReport}
        onRestart={restart}
        copy={copy}
        legalWarning={legalWarning}
        locale={locale}
        recommendedSteps={recommendedSteps}
      />
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-4xl gap-4">
      <section ref={questionSectionRef} className="premium-card scroll-mt-32 overflow-hidden p-4 md:scroll-mt-6 md:p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#0f766e]">{copy.questionLabel} {currentIndex + 1}/{questions.length}</p>
          <h2 id="risk-question-title" className="mt-1.5 text-lg font-bold leading-6 text-[#152033] md:text-xl md:leading-7">{currentQuestion.question}</h2>
          <p className="mt-1 text-xs font-semibold text-slate-500">{currentQuestion.category}</p>
        </div>

        <div
          className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200"
          role="progressbar"
          aria-label={`${copy.completed}: ${answeredCount}/${questions.length}`}
          aria-valuemin={0}
          aria-valuemax={questions.length}
          aria-valuenow={answeredCount}
        >
          <div className="h-full rounded-full bg-gradient-to-r from-[#0f766e] via-[#38bdf8] to-[#f5a623] transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-4 grid gap-2" role="group" aria-labelledby="risk-question-title">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedScore === option.score;
            return (
              <button
                key={option.score}
                type="button"
                onClick={() => chooseAnswer(option.score)}
                disabled={isAdvancing}
                aria-pressed={isSelected}
                className={`grid min-h-12 grid-cols-[36px_1fr] items-center gap-3 rounded-lg border px-3 py-2.5 text-left shadow-sm transition disabled:cursor-wait ${
                  isSelected
                    ? "border-[#0f766e] bg-emerald-50 text-[#152033] ring-2 ring-emerald-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#0f766e] hover:bg-slate-50"
                }`}
              >
                <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-black ${isSelected ? "bg-[#0f766e] text-white" : "bg-slate-100 text-slate-500"}`}>
                  {option.score}
                </span>
                <span className="text-sm font-bold leading-5">{option.label}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 text-xs font-semibold text-slate-500" aria-live="polite">{copy.autoAdvanceHint}</p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={previousQuestion}
            disabled={currentIndex === 0 || isAdvancing}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black text-[#152033] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {copy.previous}
          </button>
          <button type="button" onClick={restart} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600">
            {copy.restart}
          </button>
        </div>
      </section>

      <QuestionNavigator
        answers={answers}
        copy={copy}
        currentIndex={currentIndex}
        disabled={isAdvancing}
        questions={questions}
        onGoTo={(index) => setCurrentIndex(index)}
      />
    </div>
  );
}

function ConfirmationPanel({ copy, onConfirm, onRestart }: { copy: RiskTestCopy; onConfirm: () => void; onRestart: () => void }) {
  return (
    <section className="premium-card mx-auto w-full max-w-xl p-5 text-center md:p-6" role="status">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{copy.confirmKicker}</p>
      <h2 className="mt-2 text-2xl font-black text-[#152033]">{copy.confirmTitle}</h2>
      <p className="mx-auto mt-3 max-w-lg text-sm font-semibold leading-6 text-slate-600">{copy.confirmBody}</p>
      <div className="mt-5 grid gap-2 sm:grid-cols-2">
        <button type="button" onClick={onConfirm} className="rounded-lg bg-[#0f766e] px-4 py-3 text-sm font-black text-white shadow-sm">
          {copy.confirmYes}
        </button>
        <button type="button" onClick={onRestart} className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-black text-[#152033]">
          {copy.confirmNo}
        </button>
      </div>
    </section>
  );
}

function IntroPanel({ copy, onStart }: { copy: RiskTestCopy; onStart: () => void }) {
  return (
    <section className="risk-print-hide overflow-hidden rounded-2xl border border-slate-800 bg-[linear-gradient(135deg,#08111f,#112033)] p-5 text-white shadow-2xl md:p-7">
      <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#67e8f9]">{copy.introKicker}</p>
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight md:text-5xl">{copy.introTitle}</h1>
          <p className="mt-3 max-w-4xl text-sm leading-7 text-slate-200 md:text-base">
            {copy.introBody}
          </p>
          <p className="mt-4 max-w-3xl rounded-xl border border-amber-200/20 bg-amber-200/8 p-3 text-sm font-medium leading-6 text-amber-50">
            {copy.introWarning}
          </p>
          <button type="button" onClick={onStart} className="mt-5 min-h-12 rounded-xl bg-[#67e8f9] px-6 py-3 text-sm font-bold text-[#08111f] shadow-lg shadow-cyan-950/30 transition hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200">
            {copy.start}
          </button>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/6 p-4">
          <div className="h-3 rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-300" />
          <div className="mt-4 grid grid-cols-2 gap-2 lg:grid-cols-1">
            {copy.introFacts.map((item) => (
              <div key={item} className="rounded-lg border border-white/10 bg-white/6 px-3 py-2.5 text-sm font-semibold text-slate-100">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function HowItWorks({ copy }: { copy: RiskTestCopy }) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      {copy.howItWorks.map(([index, title, body]) => (
        <div key={title} className="premium-card p-5">
          <p className="flex h-10 w-10 items-center justify-center rounded-full bg-[#0f766e] text-sm font-black text-white">{index}</p>
          <h2 className="mt-4 text-xl font-black text-[#152033]">{title}</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
        </div>
      ))}
    </section>
  );
}

function QuestionNavigator({
  answers,
  copy,
  currentIndex,
  disabled,
  questions,
  onGoTo,
}: {
  answers: Answers;
  copy: RiskTestCopy;
  currentIndex: number;
  disabled: boolean;
  questions: RiskQuestion[];
  onGoTo: (index: number) => void;
}) {
  return (
    <details className="group premium-card overflow-hidden">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none">
        <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#0f766e]">{copy.questionNavigatorHint}</span>
        <span className="flex items-center gap-2 text-xs font-semibold text-slate-500">
          {Object.keys(answers).length}/{questions.length}
          <span aria-hidden="true" className="text-lg transition group-open:rotate-45">+</span>
        </span>
      </summary>
      <div className="border-t border-slate-200 p-4">
      <p className="sr-only">{copy.questions}</p>
      <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
        {questions.map((question, index) => (
          <button
            key={question.id}
            type="button"
            onClick={() => onGoTo(index)}
            disabled={disabled}
            aria-label={`${copy.questionLabel} ${index + 1}`}
            aria-current={currentIndex === index ? "step" : undefined}
            className={`min-h-11 rounded-lg text-xs font-bold transition disabled:cursor-wait ${
              currentIndex === index
                ? "bg-[#152033] text-white"
                : answers[question.id]
                  ? "bg-emerald-50 text-[#0f766e] ring-1 ring-emerald-200"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {index + 1}
          </button>
        ))}
      </div>
      </div>
    </details>
  );
}

function ResultReport({
  averageScore,
  dimensions,
  profile,
  email,
  emailStatus,
  emailMessage,
  onEmailChange,
  onSendEmail,
  onPrint,
  onRestart,
  copy,
  legalWarning,
  locale,
  recommendedSteps,
}: {
  averageScore: number;
  dimensions: RiskDimension[];
  profile: RiskProfile;
  email: string;
  emailStatus: "idle" | "sending" | "sent" | "error";
  emailMessage: string;
  onEmailChange: (value: string) => void;
  onSendEmail: () => void;
  onPrint: () => void;
  onRestart: () => void;
  copy: RiskTestCopy;
  legalWarning: string;
  locale: Locale;
  recommendedSteps: ReadonlyArray<{ title: string; href: string }>;
}) {
  const scorePercent = ((averageScore - 1) / 4) * 100;

  return (
    <div className="grid gap-6">
      <style>{`
        @media print {
          body { background: #ffffff !important; }
          .visual-shell > header, .visual-shell > footer, .risk-print-hide, .fixed { display: none !important; }
          main { max-width: none !important; padding: 0 !important; }
          .risk-print-report { box-shadow: none !important; border: 0 !important; }
          .risk-print-report * { color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>
      <section className="risk-print-report overflow-hidden rounded-2xl border border-white/70 bg-white shadow-2xl">
        <div className="bg-[#08111f] p-6 text-white md:p-8">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#67e8f9]">{copy.printTitle}</p>
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_260px] lg:items-end">
            <div>
              <h1 className="text-3xl font-black md:text-5xl">{profile.title}</h1>
              <p className="mt-4 max-w-4xl text-sm leading-7 text-slate-200 md:text-base">{profile.reportIntro}</p>
            </div>
            <div className="rounded-2xl border border-white/15 bg-white/10 p-5">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-300">{copy.scoreLabel}</p>
              <p className="mt-2 text-5xl font-black text-[#67e8f9]">{formatRiskScore(averageScore)}</p>
              <p className="mt-2 text-sm font-semibold text-slate-300">{copy.scoreScale}</p>
            </div>
          </div>
        </div>

        <div className="p-5 md:p-8">
          <section>
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-[0.14em] text-slate-500">
              <span>{copy.low}</span>
              <span>{copy.high}</span>
            </div>
            <div className="mt-3 h-5 rounded-full bg-slate-100 p-1">
              <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-400" style={{ width: `${scorePercent}%` }} />
            </div>
            <div className="relative mt-2 h-8">
              <div className="absolute top-0 -translate-x-1/2 rounded-full bg-[#152033] px-3 py-1 text-xs font-black text-white" style={{ left: `${scorePercent}%` }}>
                {formatRiskScore(averageScore)}
              </div>
            </div>
          </section>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            <ReportCard title={copy.summary} items={[profile.shortDescription, copy.awarenessMessage]} />
            <ReportCard title={copy.strengths} items={profile.strengths} />
            <ReportCard title={copy.behavioralRisks} items={profile.behavioralRisks} />
          </div>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="text-xl font-bold text-[#152033]">{copy.dimensionsTitle}</h2>
              <p className="text-xs font-semibold text-slate-500">{copy.dimensionNote}</p>
            </div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {dimensions.map((dimension) => {
                const percent = Math.max(0, Math.min(100, ((dimension.score - 1) / 4) * 100));
                return (
                  <div key={dimension.label} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-[#152033]">{dimension.label}</h3>
                      <span className="text-xs font-bold tabular-nums text-[#0f766e]">{formatRiskScore(dimension.score)}</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100" role="meter" aria-label={`${dimension.label}: ${dimension.note}`} aria-valuemin={1} aria-valuemax={5} aria-valuenow={dimension.score}>
                      <div className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-400" style={{ width: `${percent}%` }} />
                    </div>
                    <p className="mt-2 text-xs font-medium text-slate-500">{dimension.note}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-[#d1bfa7]/45 bg-[#fffaf6] p-5">
            <h2 className="text-xl font-black text-[#152033]">{copy.portfolioSuggestion}</h2>
            <ul className="mt-4 grid gap-2 md:grid-cols-2">
              {profile.portfolioSuggestions.map((item) => (
                <li key={item} className="rounded-xl bg-white px-4 py-3 text-sm font-bold leading-6 text-slate-700 shadow-sm">{item}</li>
              ))}
            </ul>
          </section>

          <section className="mt-6">
            <h2 className="text-xl font-black text-[#152033]">{copy.assetApproach}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
              {[
                [copy.assetLabels[0], profile.assetNotes.stocks],
                [copy.assetLabels[1], profile.assetNotes.fx],
                [copy.assetLabels[2], profile.assetNotes.gold],
                [copy.assetLabels[3], profile.assetNotes.crypto],
                [copy.assetLabels[4], profile.assetNotes.cash],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <h3 className="text-sm font-black text-[#0f766e]">{title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-xl font-black text-[#152033]">{copy.nextSteps}</h2>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {recommendedSteps.map((step) => (
                <Link key={step.title} href={`/${locale}${step.href}`} className="rounded-xl border border-white bg-white px-4 py-3 text-sm font-black text-[#152033] shadow-sm hover:text-[#0f766e]">
                  {step.title}
                </Link>
              ))}
            </div>
          </section>

          <p className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold leading-6 text-amber-900">{legalWarning}</p>
        </div>
      </section>

      <section className="risk-print-hide grid gap-4 lg:grid-cols-[1fr_1fr]">
        <div className="premium-card p-5">
          <h2 className="text-xl font-black text-[#152033]">{copy.getReport}</h2>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={onPrint} className="rounded-xl bg-[#152033] px-5 py-3 text-sm font-black text-white">
              {copy.pdf}
            </button>
            <button type="button" onClick={onRestart} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#152033]">
              {copy.restart}
            </button>
          </div>
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">{copy.pdfHint}</p>
        </div>

        <div className="premium-card p-5">
          <h2 className="text-xl font-black text-[#152033]">{copy.emailTitle}</h2>
          <label htmlFor="risk-report-email" className="mt-4 block text-sm font-bold text-slate-700">{copy.emailLabel}</label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="risk-report-email"
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder={copy.emailPlaceholder}
              aria-describedby="risk-email-privacy risk-email-status"
              aria-invalid={emailStatus === "error"}
              className="min-h-12 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-[#152033] outline-none focus:border-[#0f766e]"
            />
            <button
              type="button"
              onClick={onSendEmail}
              disabled={emailStatus === "sending"}
              className="rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-black text-white disabled:bg-slate-300"
            >
              {emailStatus === "sending" ? copy.emailSending : copy.emailButton}
            </button>
          </div>
          <p id="risk-email-privacy" className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            {copy.emailPrivacy}
          </p>
          <p id="risk-email-status" role={emailStatus === "error" ? "alert" : "status"} aria-live="polite" className={`mt-3 min-h-5 text-sm font-bold ${emailStatus === "error" ? "text-red-600" : "text-[#0f766e]"}`}>{emailMessage}</p>
        </div>
      </section>
    </div>
  );
}

function ReportCard({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="text-lg font-black text-[#152033]">{title}</h2>
      <ul className="mt-3 grid gap-2">
        {items.map((item) => (
          <li key={item} className="text-sm font-semibold leading-6 text-slate-600">{item}</li>
        ))}
      </ul>
    </section>
  );
}
