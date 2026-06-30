"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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
type SavedRiskTestState = {
  answers: Answers;
  currentIndex: number;
  started: boolean;
  showResult: boolean;
};

const storageKey = "enbilir-risk-appetite-test:v1";
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RiskTestCopy = {
  questionLabel: string;
  completed: string;
  previous: string;
  restart: string;
  next: string;
  result: string;
  introKicker: string;
  introTitle: string;
  introBody: string;
  introWarning: string;
  start: string;
  introFacts: string[];
  howItWorks: Array<[string, string, string]>;
  questions: string;
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
  emailPlaceholder: string;
  emailButton: string;
  emailSending: string;
  emailPrivacy: string;
  invalidEmail: string;
  emailError: string;
  emailSentFallback: string;
  printTitle: string;
};

const copyByLocale: Record<Locale, RiskTestCopy> = {
  tr: {
    questionLabel: "Soru",
    completed: "Tamamlanan",
    previous: "Önceki Soru",
    restart: "Testi Yeniden Başlat",
    next: "Sonraki Soru",
    result: "Sonucu Gör",
    introKicker: "Enbilir farkındalık aracı",
    introTitle: "Risk İştahı Testi",
    introBody: "Piyasalarda nasıl karar verdiğini, belirsizliğe nasıl tepki verdiğini ve sanal portföyünü hangi risk profiliyle yönetmen gerektiğini keşfet.",
    introWarning: "Bu test yatırım tavsiyesi değildir. Amaç, finansal karar alma eğilimlerini tanımana ve sanal portföy deneyimini daha bilinçli kullanmana yardımcı olmaktır.",
    start: "Teste Başla",
    introFacts: ["35 soru", "5 risk seviyesi", "PDF/print raporu", "E-posta özeti"],
    howItWorks: [
      ["1", "Cevapla", "Her soruda risk iştahını 1 ile 5 arasında temsil eden seçeneği işaretle."],
      ["2", "Geri dön", "İstediğin soruya geri dönüp cevabını değiştirebilirsin."],
      ["3", "Rapor al", "Ortalama puanına göre risk profili, davranışsal riskler ve sanal portföy önerileri gösterilir."],
    ],
    questions: "Sorular",
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
    emailPlaceholder: "ornek@eposta.com",
    emailButton: "Raporu E-Postama Gönder",
    emailSending: "Gönderiliyor...",
    emailPrivacy: "E-posta adresiniz yalnızca bu raporu göndermek için kullanılır; açık rızanız olmadan pazarlama amacıyla saklanmaz.",
    invalidEmail: "Lütfen geçerli bir e-posta adresi gir.",
    emailError: "Rapor gönderilemedi.",
    emailSentFallback: "Rapor özeti e-posta adresine gönderildi.",
    printTitle: "Enbilir Risk İştahı Testi",
  },
  en: {
    questionLabel: "Question",
    completed: "Completed",
    previous: "Previous Question",
    restart: "Restart Test",
    next: "Next Question",
    result: "See Result",
    introKicker: "Enbilir awareness tool",
    introTitle: "Risk Appetite Test",
    introBody: "Discover how you make decisions in markets, how you react to uncertainty, and which risk profile can guide your virtual portfolio practice.",
    introWarning: "This test is not investment advice. Its purpose is to help you understand your financial decision tendencies and use the virtual portfolio experience more consciously.",
    start: "Start Test",
    introFacts: ["35 questions", "5 risk levels", "PDF/print report", "Email summary"],
    howItWorks: [
      ["1", "Answer", "Choose the option that best represents your risk appetite from 1 to 5."],
      ["2", "Go back", "You can return to any question and change your answer."],
      ["3", "Get report", "Your average score becomes a risk profile with behavioral risks and virtual portfolio suggestions."],
    ],
    questions: "Questions",
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
    emailPlaceholder: "name@email.com",
    emailButton: "Send Report to My Email",
    emailSending: "Sending...",
    emailPrivacy: "Your email address is used only to send this report; it is not stored for marketing without your explicit consent.",
    invalidEmail: "Please enter a valid email address.",
    emailError: "The report could not be sent.",
    emailSentFallback: "The report summary was sent to your email address.",
    printTitle: "Enbilir Risk Appetite Test",
  },
};

function getInitialState(questions: RiskQuestion[], locale: Locale): SavedRiskTestState {
  if (typeof window === "undefined") {
    return { answers: {}, currentIndex: 0, started: false, showResult: false };
  }

  const saved = window.localStorage.getItem(`${storageKey}:${locale}`);
  if (!saved) {
    return { answers: {}, currentIndex: 0, started: false, showResult: false };
  }

  try {
    const parsed = JSON.parse(saved) as Partial<SavedRiskTestState>;
    return {
      answers: parsed.answers ?? {},
      currentIndex: Math.min(Math.max(parsed.currentIndex ?? 0, 0), questions.length - 1),
      started: Boolean(parsed.started),
      showResult: Boolean(parsed.showResult),
    };
  } catch {
    window.localStorage.removeItem(`${storageKey}:${locale}`);
    return { answers: {}, currentIndex: 0, started: false, showResult: false };
  }
}

export function RiskAppetiteTestClient({ locale }: { locale: Locale }) {
  const copy = copyByLocale[locale];
  const questions = useMemo(() => getRiskQuestionsForLocale(locale), [locale]);
  const legalWarning = getRiskLegalWarningForLocale(locale);
  const recommendedSteps = getRecommendedNextStepsForLocale(locale);
  const [initialState] = useState(() => getInitialState(questions, locale));
  const [started, setStarted] = useState(initialState.started);
  const [currentIndex, setCurrentIndex] = useState(initialState.currentIndex);
  const [answers, setAnswers] = useState<Answers>(initialState.answers);
  const [showResult, setShowResult] = useState(initialState.showResult);
  const [email, setEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [emailMessage, setEmailMessage] = useState("");
  const currentQuestion = questions[currentIndex];
  const answeredCount = questions.filter((question) => answers[question.id]).length;
  const progress = Math.round((answeredCount / questions.length) * 100);
  const averageScore = useMemo(() => calculateAverageScoreForQuestions(questions, answers), [answers, questions]);
  const profile = averageScore === null ? null : getRiskProfileForLocale(averageScore, locale);
  const selectedScore = answers[currentQuestion.id];

  useEffect(() => {
    window.localStorage.setItem(`${storageKey}:${locale}`, JSON.stringify({ answers, currentIndex, started, showResult }));
  }, [answers, currentIndex, locale, started, showResult]);

  function chooseAnswer(score: number) {
    setAnswers((current) => ({ ...current, [currentQuestion.id]: score }));
  }

  function nextQuestion() {
    if (!selectedScore) {
      return;
    }

    if (currentIndex === questions.length - 1) {
      if (answeredCount === questions.length) {
        setShowResult(true);
      }
      return;
    }

    setCurrentIndex((index) => Math.min(index + 1, questions.length - 1));
  }

  function previousQuestion() {
    setCurrentIndex((index) => Math.max(index - 1, 0));
    setShowResult(false);
  }

  function restart() {
    setAnswers({});
    setCurrentIndex(0);
    setStarted(false);
    setShowResult(false);
    setEmail("");
    setEmailStatus("idle");
    setEmailMessage("");
    window.localStorage.removeItem(`${storageKey}:${locale}`);
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

  if (showResult && profile && averageScore !== null) {
    return (
      <ResultReport
        averageScore={averageScore}
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
    <div className="grid gap-6">
      <section className="premium-card overflow-hidden p-5 md:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{copy.questionLabel} {currentIndex + 1}/{questions.length}</p>
            <h2 className="mt-2 text-2xl font-black text-[#152033] md:text-3xl">{currentQuestion.question}</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">{currentQuestion.category}</p>
          </div>
          <div className="rounded-2xl border border-[#d1bfa7]/40 bg-[#fffaf6] p-4 text-sm font-black text-[#152033]">
            {copy.completed}: {answeredCount}/{questions.length}
          </div>
        </div>

        <div className="mt-6 h-3 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full rounded-full bg-gradient-to-r from-[#0f766e] via-[#38bdf8] to-[#f5a623] transition-all" style={{ width: `${progress}%` }} />
        </div>

        <div className="mt-6 grid gap-3">
          {currentQuestion.options.map((option) => {
            const isSelected = selectedScore === option.score;
            return (
              <button
                key={option.score}
                type="button"
                onClick={() => chooseAnswer(option.score)}
                className={`grid gap-2 rounded-2xl border p-4 text-left shadow-sm transition md:grid-cols-[56px_1fr] md:items-center ${
                  isSelected
                    ? "border-[#0f766e] bg-emerald-50 text-[#152033] ring-2 ring-emerald-100"
                    : "border-slate-200 bg-white text-slate-700 hover:border-[#0f766e] hover:bg-slate-50"
                }`}
              >
                <span className={`flex h-11 w-11 items-center justify-center rounded-full text-lg font-black ${isSelected ? "bg-[#0f766e] text-white" : "bg-slate-100 text-slate-500"}`}>
                  {option.score}
                </span>
                <span className="text-base font-black leading-6">{option.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={previousQuestion}
            disabled={currentIndex === 0}
            className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-[#152033] disabled:cursor-not-allowed disabled:opacity-45"
          >
            {copy.previous}
          </button>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={restart} className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-black text-slate-600">
              {copy.restart}
            </button>
            <button
              type="button"
              onClick={nextQuestion}
              disabled={!selectedScore || (currentIndex === questions.length - 1 && answeredCount !== questions.length)}
              className="rounded-xl bg-[#0f766e] px-5 py-3 text-sm font-black text-white shadow-sm disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {currentIndex === questions.length - 1 ? copy.result : copy.next}
            </button>
          </div>
        </div>
      </section>

      <QuestionNavigator answers={answers} copy={copy} currentIndex={currentIndex} questions={questions} onGoTo={(index) => setCurrentIndex(index)} />
    </div>
  );
}

function IntroPanel({ copy, onStart }: { copy: RiskTestCopy; onStart: () => void }) {
  return (
    <section className="risk-print-hide overflow-hidden rounded-2xl border border-white/70 bg-[#08111f] p-6 text-white shadow-2xl md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.25fr_0.75fr] lg:items-center">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-[#67e8f9]">{copy.introKicker}</p>
          <h1 className="mt-3 text-4xl font-black leading-tight md:text-6xl">{copy.introTitle}</h1>
          <p className="mt-4 max-w-4xl text-base leading-8 text-slate-200 md:text-lg">
            {copy.introBody}
          </p>
          <p className="mt-4 max-w-3xl rounded-2xl border border-amber-200/25 bg-amber-200/10 p-4 text-sm font-semibold leading-6 text-amber-50">
            {copy.introWarning}
          </p>
          <button type="button" onClick={onStart} className="mt-6 rounded-xl bg-[#67e8f9] px-6 py-3 text-sm font-black text-[#08111f] shadow-lg shadow-cyan-950/30">
            {copy.start}
          </button>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/8 p-5">
          <div className="h-3 rounded-full bg-gradient-to-r from-emerald-300 via-sky-300 to-amber-300" />
          <div className="mt-5 grid gap-3">
            {copy.introFacts.map((item) => (
              <div key={item} className="rounded-xl border border-white/10 bg-white/8 px-4 py-3 text-sm font-black text-slate-100">
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
  questions,
  onGoTo,
}: {
  answers: Answers;
  copy: RiskTestCopy;
  currentIndex: number;
  questions: RiskQuestion[];
  onGoTo: (index: number) => void;
}) {
  return (
    <section className="premium-card p-5">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-[#0f766e]">{copy.questions}</p>
      <div className="mt-4 grid grid-cols-5 gap-2 sm:grid-cols-7 md:grid-cols-10 lg:grid-cols-12">
        {questions.map((question, index) => (
          <button
            key={question.id}
            type="button"
            onClick={() => onGoTo(index)}
            className={`h-10 rounded-lg text-sm font-black ${
              currentIndex === index
                ? "bg-[#152033] text-white"
                : answers[question.id]
                  ? "bg-emerald-50 text-[#0f766e] ring-1 ring-emerald-200"
                  : "bg-slate-100 text-slate-500"
            }`}
          >
            {question.id}
          </button>
        ))}
      </div>
    </section>
  );
}

function ResultReport({
  averageScore,
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
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
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
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              value={email}
              onChange={(event) => onEmailChange(event.target.value)}
              placeholder={copy.emailPlaceholder}
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
          <p className="mt-3 text-xs font-semibold leading-5 text-slate-500">
            {copy.emailPrivacy}
          </p>
          {emailMessage ? <p className={`mt-3 text-sm font-black ${emailStatus === "error" ? "text-red-600" : "text-[#0f766e]"}`}>{emailMessage}</p> : null}
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
