import { VIP_AGENT_STRATEGIES } from "@/lib/vip-agents/config";

const ACTION_LABELS: Record<string, string> = {
  BUY: "AL",
  SELL: "SAT",
  HOLD: "TUT",
  SUMMARY: "PORTFÖYÜ KORU",
};

const ACTION_PRIORITY: Record<string, number> = {
  SELL: 0,
  BUY: 1,
  HOLD: 2,
};

const CHANGE_THRESHOLDS: Record<string, number> = {
  CRYPTO: 7,
  NASDAQ: 4.5,
  DOW: 4,
  BIST: 5,
  FX: 1.25,
  COMMODITY: 3,
  INDEX: 2,
};

const MACRO_NEWS_CATEGORIES = new Set(["macro", "turkey", "fx", "energy", "metals", "asia"]);

export type VipDigestUniverseItem = {
  symbol: string;
  name: string;
  category: string;
  source: string;
  dataStatus: string;
  priceUsd: number;
  changePercent: number;
};

export type VipDigestTechnicalCandidate = {
  symbol: string;
  displayName: string;
  lastPrice: number;
  breakoutLevel: number;
  volumeRatio20d: number;
  volumeBreakout: boolean;
  rsi14: number;
  rsiDivergence: "BULLISH" | "BEARISH" | "NONE";
  macdDivergence: "BULLISH" | "BEARISH" | "NONE";
  crowdingLevel: string;
  crowdingScore: number;
  technicalScore: number;
};

export type VipUniverseAlert = {
  symbol: string;
  displayName: string;
  kind: "MOVE" | "BREAKOUT" | "WATCH" | "DIVERGENCE" | "CROWDING";
  status: "DOĞRULANDI" | "YAKIN İZLEME";
  label: string;
  commentary: string;
  changePercent: number | null;
  priority: number;
};

export type VipUniversePulse = {
  universeSize: number;
  verifiedQuoteCount: number;
  totalAlertCount: number;
  alerts: VipUniverseAlert[];
};

export type VipDigestIdea = {
  id: string;
  symbol: string;
  displayName: string;
  currency: string;
  rank: number;
  stance: string;
  thesisSummary: string;
  confidenceScore: number;
  riskScore: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targetPrice: number;
};

export type VipDigestAgentInput = {
  id: string;
  slug: string;
  name: string;
  riskProfile: string;
  description: string;
  decisions: Array<{
    symbol: string;
    action: string;
    priceUsd: number | null;
    reason: string;
    sourceIdeaId: string | null;
  }>;
  positions: Array<{
    symbol: string;
    stopLossUsd: number;
    targetPriceUsd: number;
  }>;
  snapshots: Array<{
    pnlUsd: number;
    returnPercent: number;
  }>;
};

export type VipAgentDigestDecision = {
  symbol: string;
  action: string;
  actionLabel: string;
  currency: string;
  priceUsd: number | null;
  reason: string;
  entryLow: number | null;
  entryHigh: number | null;
  stopLoss: number | null;
  targetPrice: number | null;
};

export type VipAgentDigest = {
  slug: string;
  name: string;
  riskProfile: string;
  description: string;
  dailyActionLabel: string;
  dailyAdvice: string;
  decisions: VipAgentDigestDecision[];
  hiddenDecisionCount: number;
  skippedCount: number;
  errorCount: number;
  summary: string;
  pnlUsd: number | null;
  returnPercent: number | null;
};

export type VipDigestNewsItem = {
  title: string;
  link: string;
  source: string;
  category: string | null;
  publishedAt: Date | null;
};

export type VipDigestMacroReport = {
  id: string;
  generatedAt: Date;
  macroSummary: string;
  marketRegime: string | null;
  riskAppetite: string | null;
  keyTakeaways: string[];
  newsItems: VipDigestNewsItem[];
} | null;

export type VipDailyDigestInput = {
  recipientName: string;
  report: {
    id: string;
    periodKey: string;
    fallbackUsed: boolean;
    executiveSummary: string;
    marketContext: string;
    disclaimer: string;
    ideas: VipDigestIdea[];
  };
  macroReport: VipDigestMacroReport;
  universePulse: VipUniversePulse;
  agents: VipAgentDigest[];
  urls: {
    home: string;
    report: string;
    macroReport: string | null;
    agents: string;
    agent: (slug: string) => string;
    idea: (ideaId: string) => string;
    asset: (symbol: string) => string;
  };
};

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function compactText(value: string, maximumLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= maximumLength) return normalized;

  const clipped = normalized.slice(0, maximumLength + 1);
  const sentence = clipped.match(/^(.{1,}\.(?:\s|$))/)?.[1]?.trim();
  if (sentence && sentence.length >= maximumLength * 0.55) return sentence;

  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > maximumLength * 0.7 ? lastSpace : maximumLength).trim()}…`;
}

function formatUsd(value: number | null, digits = 2) {
  if (!finite(value)) return "—";

  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

function formatPriceLevel(value: number | null, currency: string) {
  if (!finite(value)) return "—";

  const normalizedCurrency = /^[A-Z]{3}$/.test(currency.toUpperCase()) ? currency.toUpperCase() : "USD";
  const maximumFractionDigits = Math.abs(value) < 10 ? 4 : 2;
  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits,
  }).format(value)} ${normalizedCurrency}`;
}

function formatSignedPercent(value: number | null) {
  if (!finite(value)) return "—";
  return `${value > 0 ? "+" : ""}${value.toFixed(Math.abs(value) < 1 ? 2 : 1)}%`;
}

function simpleAlertInstruction(alert: VipUniverseAlert) {
  if (alert.kind === "BREAKOUT") {
    return `${alert.symbol} hacimli kırılım yaptı. Hacmin devamını takip et. Teyit yoksa alma.`;
  }

  if (alert.kind === "DIVERGENCE") {
    return alert.label.toLocaleLowerCase("tr-TR").includes("negatif")
      ? `${alert.symbol} için negatif uyumsuzluk var. Düşüş riski arttı. Yeni alım yapma.`
      : `${alert.symbol} için pozitif uyumsuzluk var. Toparlanma olabilir. İkinci sinyali bekle.`;
  }

  if (alert.kind === "CROWDING") {
    return `${alert.symbol} kalabalık görünüyor. Düzeltme riski arttı. Fiyatı kovalama.`;
  }

  if (alert.kind === "WATCH") {
    return `${alert.symbol} kritik seviyeye yaklaştı. Teyit gelmeden işlem yapma.`;
  }

  if (finite(alert.changePercent) && alert.changePercent > 0) {
    return `${alert.symbol} hızlı yükseldi. Fiyatı kovalama. Hacmi takip et.`;
  }

  if (finite(alert.changePercent) && alert.changePercent < 0) {
    return `${alert.symbol} hızlı düştü. Yeni işlem için bekle. Stop planını koru.`;
  }

  return `${alert.symbol} için önemli bir hareket var. Teyit gelmeden işlem yapma.`;
}

function simpleDirectionInstruction(alert: VipUniverseAlert) {
  if (alert.kind === "BREAKOUT") return `${alert.symbol} artabilir. Hacim düşerse hareket zayıflayabilir.`;
  if (alert.kind === "CROWDING") return `${alert.symbol} geri çekilebilir. Fiyatı kovalama.`;
  if (alert.kind === "WATCH") return `${alert.symbol} kritik seviyeyi geçerse artabilir. Geçemezse geri çekilebilir.`;
  if (alert.kind === "DIVERGENCE") {
    return alert.label.toLocaleLowerCase("tr-TR").includes("negatif")
      ? `${alert.symbol} düşebilir. Yeni alım yapma.`
      : `${alert.symbol} toparlanabilir. İkinci sinyali bekle.`;
  }
  if (finite(alert.changePercent) && alert.changePercent > 0) {
    return `${alert.symbol} artabilir. Hacim düşerse hareket zayıflayabilir.`;
  }
  if (finite(alert.changePercent) && alert.changePercent < 0) {
    return `${alert.symbol} düşebilir. Yeni işlem için acele etme.`;
  }
  return `${alert.symbol} için yön net değil. Teyit bekle.`;
}

function simpleIdeaInstruction(idea: VipDigestIdea) {
  const entry = `${formatPriceLevel(idea.entryLow, idea.currency)}–${formatPriceLevel(idea.entryHigh, idea.currency)}`;
  const stop = formatPriceLevel(idea.stopLoss, idea.currency);

  if (idea.stance === "AL") {
    return `${idea.symbol} için giriş aralığı ${entry}. Bu aralığın üstünde fiyatı kovalama. ${stop} altında çık.`;
  }

  if (idea.stance === "SAT" || idea.stance === "UZAK_DUR") {
    return `${idea.symbol} için yeni işlem açma. ${stop} seviyesini risk sınırı olarak izle.`;
  }

  return `${idea.symbol} için bekle. Giriş aralığı ${entry}. Teyit gelmeden işlem yapma.`;
}

function simpleDecisionAdvice(decision: VipAgentDigestDecision) {
  if (decision.action === "SELL") {
    return `${decision.symbol} pozisyonunu kapat. Yeni giriş için tekrar teyit bekle.`;
  }

  if (decision.action === "BUY") {
    const entry = decision.entryLow !== null && decision.entryHigh !== null
      ? `${formatPriceLevel(decision.entryLow, decision.currency)}–${formatPriceLevel(decision.entryHigh, decision.currency)}`
      : null;
    return `${decision.symbol} için ${entry ? `yalnız ${entry} aralığında al` : "giriş seviyesini bekle"}. Stop olmadan işlem yapma.`;
  }

  return `${decision.symbol} pozisyonunu tut. Stop ve hedef planını değiştirme.`;
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.hostname === "localhost") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function extractVipTechnicalCandidates(value: unknown): VipDigestTechnicalCandidate[] {
  if (!Array.isArray(value)) return [];

  return value.flatMap((candidate) => {
    const record = object(candidate);
    const technical = object(record?.technical);
    if (!record || !technical || typeof record.symbol !== "string") return [];

    const requiredNumbers = [
      technical.lastPrice,
      technical.breakoutLevel,
      technical.volumeRatio20d,
      technical.rsi14,
      technical.crowdingScore,
      technical.technicalScore,
    ];
    if (!requiredNumbers.every(finite)) return [];

    const divergence = (input: unknown): "BULLISH" | "BEARISH" | "NONE" =>
      input === "BULLISH" || input === "BEARISH" ? input : "NONE";

    return [{
      symbol: record.symbol,
      displayName: typeof record.displayName === "string" ? record.displayName : record.symbol,
      lastPrice: technical.lastPrice as number,
      breakoutLevel: technical.breakoutLevel as number,
      volumeRatio20d: technical.volumeRatio20d as number,
      volumeBreakout: technical.volumeBreakout === true,
      rsi14: technical.rsi14 as number,
      rsiDivergence: divergence(technical.rsiDivergence),
      macdDivergence: divergence(technical.macdDivergence),
      crowdingLevel: typeof technical.crowdingLevel === "string" ? technical.crowdingLevel : "LOW",
      crowdingScore: technical.crowdingScore as number,
      technicalScore: technical.technicalScore as number,
    }];
  });
}

function strongestTechnicalAlert(candidate: VipDigestTechnicalCandidate): VipUniverseAlert | null {
  const common = {
    symbol: candidate.symbol,
    displayName: candidate.displayName,
    changePercent: null,
  };

  if (candidate.volumeBreakout) {
    return {
      ...common,
      kind: "BREAKOUT",
      status: "DOĞRULANDI",
      label: "Hacimli kırılım",
      commentary: `Fiyat kırılım eşiğini geçti; hacim 20 günlük ortalamanın ${candidate.volumeRatio20d.toFixed(2)} katı. Teyit ve geri çekilme davranışı izlenmeli.`,
      priority: 130 + candidate.technicalScore,
    };
  }

  if (
    (candidate.crowdingLevel === "EXTREME" || candidate.crowdingLevel === "HIGH")
    && (candidate.rsi14 >= 65 || candidate.volumeRatio20d >= 1.25)
  ) {
    return {
      ...common,
      kind: "CROWDING",
      status: "DOĞRULANDI",
      label: candidate.crowdingLevel === "EXTREME" ? "Aşırı fiyatlama riski" : "Kalabalık pozisyon riski",
      commentary: `Kalabalıklaşma skoru ${candidate.crowdingScore}/100. Güçlü görünse bile yeni girişte fiyat kovalamama ve geri çekilme teyidi disiplini gerekiyor.`,
      priority: (candidate.crowdingLevel === "EXTREME" ? 125 : 100) + candidate.crowdingScore,
    };
  }

  const bearishDivergence = candidate.rsiDivergence === "BEARISH" || candidate.macdDivergence === "BEARISH";
  const bullishDivergence = candidate.rsiDivergence === "BULLISH" || candidate.macdDivergence === "BULLISH";
  const divergenceConfirmed = bearishDivergence
    ? candidate.technicalScore <= 45 || candidate.rsi14 >= 68 || candidate.volumeRatio20d >= 1.15
    : candidate.technicalScore >= 60 || candidate.rsi14 <= 42 || candidate.volumeRatio20d >= 1.15;
  if ((bearishDivergence || bullishDivergence) && divergenceConfirmed) {
    return {
      ...common,
      kind: "DIVERGENCE",
      status: "YAKIN İZLEME",
      label: bearishDivergence ? "Negatif uyumsuzluk" : "Pozitif uyumsuzluk",
      commentary: `${candidate.rsiDivergence !== "NONE" ? "RSI" : "MACD"} fiyat hareketini ${bearishDivergence ? "aşağı yönlü risk" : "yukarı yönlü toparlanma olasılığı"} açısından teyit etmiyor; ikinci sinyal beklenmeli.`,
      priority: 105 + candidate.technicalScore,
    };
  }

  const breakoutGap = candidate.breakoutLevel > 0
    ? ((candidate.breakoutLevel - candidate.lastPrice) / candidate.breakoutLevel) * 100
    : Number.POSITIVE_INFINITY;
  if (breakoutGap >= 0 && breakoutGap <= 2 && candidate.volumeRatio20d >= 1.05 && candidate.technicalScore >= 60) {
    return {
      ...common,
      kind: "WATCH",
      status: "YAKIN İZLEME",
      label: "Kırılım eşiğine yaklaşıyor",
      commentary: `Fiyat kırılım seviyesine %${breakoutGap.toFixed(1)} mesafede; hacim oranı ${candidate.volumeRatio20d.toFixed(2)}. Kırılım gerçekleşmeden işlem teyidi sayılmaz.`,
      priority: 90 + candidate.technicalScore,
    };
  }

  return null;
}

export function buildVipUniversePulse(
  items: VipDigestUniverseItem[],
  technicalCandidates: VipDigestTechnicalCandidate[],
  limit = 6,
): VipUniversePulse {
  const verifiedItems = items.filter((item) =>
    (item.source === "binance" || item.source === "yahoo")
    && finite(item.changePercent)
    && finite(item.priceUsd)
    && item.priceUsd > 0,
  );
  const alertsBySymbol = new Map<string, VipUniverseAlert>();

  for (const item of verifiedItems) {
    const threshold = CHANGE_THRESHOLDS[item.category];
    if (!threshold || Math.abs(item.changePercent) < threshold) continue;

    const alert: VipUniverseAlert = {
      symbol: item.symbol,
      displayName: item.name,
      kind: "MOVE",
      status: "DOĞRULANDI",
      label: item.changePercent > 0 ? "Olağandışı yukarı hareket" : "Olağandışı aşağı hareket",
      commentary: `${item.category} için günlük olağandışı hareket eşiği aşıldı. Haber, hacim ve açılış boşluğu teyidi olmadan hareket kovalanmamalı.`,
      changePercent: item.changePercent,
      priority: 60 + Math.min(60, (Math.abs(item.changePercent) / threshold) * 18),
    };
    alertsBySymbol.set(item.symbol, alert);
  }

  const changeBySymbol = new Map(verifiedItems.map((item) => [item.symbol, item.changePercent]));
  for (const candidate of technicalCandidates) {
    const alert = strongestTechnicalAlert(candidate);
    if (!alert) continue;
    alert.changePercent = changeBySymbol.get(candidate.symbol) ?? null;
    const existing = alertsBySymbol.get(candidate.symbol);
    if (!existing || alert.priority > existing.priority) alertsBySymbol.set(candidate.symbol, alert);
  }

  const allAlerts = Array.from(alertsBySymbol.values())
    .sort((left, right) => right.priority - left.priority || left.symbol.localeCompare(right.symbol));

  return {
    universeSize: items.length,
    verifiedQuoteCount: verifiedItems.length,
    totalAlertCount: allAlerts.length,
    alerts: allAlerts.slice(0, Math.max(1, limit)),
  };
}

export function buildVipAgentDigest(agents: VipDigestAgentInput[], ideas: VipDigestIdea[]): VipAgentDigest[] {
  const ideaById = new Map(ideas.map((idea) => [idea.id, idea]));
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));

  return VIP_AGENT_STRATEGIES.map((strategy) => {
    const agent = agentById.get(strategy.id) ?? {
      id: strategy.id,
      slug: strategy.slug,
      name: strategy.name,
      riskProfile: strategy.riskProfile,
      description: strategy.description,
      decisions: [],
      positions: [],
      snapshots: [],
    };
    const actionable = agent.decisions
      .filter((decision) => decision.symbol !== "PORTFOY" && decision.action in ACTION_PRIORITY)
      .sort((left, right) => ACTION_PRIORITY[left.action] - ACTION_PRIORITY[right.action] || left.symbol.localeCompare(right.symbol));
    const positionBySymbol = new Map(agent.positions.map((position) => [position.symbol, position]));
    const visible = actionable.slice(0, 3).map((decision): VipAgentDigestDecision => {
      const idea = decision.sourceIdeaId ? ideaById.get(decision.sourceIdeaId) : undefined;
      const position = positionBySymbol.get(decision.symbol);

      return {
        symbol: decision.symbol,
        action: decision.action,
        actionLabel: ACTION_LABELS[decision.action] ?? decision.action,
        currency: idea?.currency ?? "USD",
        priceUsd: decision.priceUsd,
        reason: decision.reason,
        entryLow: idea?.entryLow ?? null,
        entryHigh: idea?.entryHigh ?? null,
        stopLoss: position?.stopLossUsd ?? idea?.stopLoss ?? null,
        targetPrice: position?.targetPriceUsd ?? idea?.targetPrice ?? null,
      };
    });
    const portfolioSummary = agent.decisions.find((decision) => decision.symbol === "PORTFOY");
    const snapshot = agent.snapshots[0];
    const skippedCount = agent.decisions.filter((decision) => decision.action === "SKIP").length;
    const errorCount = agent.decisions.filter((decision) => decision.action === "ERROR").length;
    const leadDecision = visible[0];
    const dailyAction = leadDecision
      ? {
          label: `${leadDecision.actionLabel} · ${leadDecision.symbol}`,
          advice: simpleDecisionAdvice(leadDecision),
        }
      : errorCount > 0 && skippedCount === 0
        ? {
            label: "VERİYİ BEKLE",
            advice: "Veri doğrulanmadı. Bugün işlem yapma. Yeni veriyi bekle.",
          }
        : portfolioSummary || skippedCount > 0
          ? {
              label: "PORTFÖYÜ KORU",
              advice: "Bugün yeni alım yapma. Nakit ve portföyü koru. Adaylar işlem eşiğini geçmedi.",
            }
          : {
              label: "BEKLE",
              advice: "Bugün doğrulanmış yeni karar yok. Yeni işlem yapma. Bir sonraki raporu bekle.",
            };

    return {
      slug: agent.slug,
      name: agent.name,
      riskProfile: agent.riskProfile,
      description: agent.description,
      dailyActionLabel: dailyAction.label,
      dailyAdvice: dailyAction.advice,
      decisions: visible,
      hiddenDecisionCount: Math.max(0, actionable.length - visible.length),
      skippedCount,
      errorCount,
      summary: portfolioSummary?.reason ?? dailyAction.advice,
      pnlUsd: snapshot?.pnlUsd ?? null,
      returnPercent: snapshot?.returnPercent ?? null,
    };
  });
}

function newsGroups(newsItems: VipDigestNewsItem[]) {
  const unique = new Map<string, VipDigestNewsItem>();
  for (const item of newsItems) {
    const url = safeExternalUrl(item.link);
    if (!url || !item.title.trim()) continue;
    const key = item.title.trim().toLocaleLowerCase("tr-TR");
    if (!unique.has(key)) unique.set(key, { ...item, link: url });
  }
  const items = Array.from(unique.values());
  return {
    macro: items.filter((item) => MACRO_NEWS_CATEGORIES.has(item.category ?? "")).slice(0, 2),
    micro: items.filter((item) => !MACRO_NEWS_CATEGORIES.has(item.category ?? "")).slice(0, 2),
  };
}

function htmlButton(label: string, url: string, secondary = false) {
  return `<a href="${escapeHtml(url)}" style="display:inline-block;padding:10px 14px;border-radius:10px;text-decoration:none;font-size:12px;font-weight:800;${secondary ? "border:1px solid #cbd5e1;color:#0f766e;background:#ffffff" : "background:#0f766e;color:#ffffff"}">${escapeHtml(label)}</a>`;
}

function renderNewsList(title: string, items: VipDigestNewsItem[]) {
  if (items.length === 0) return "";
  return `<div style="margin-top:12px"><p style="margin:0 0 6px;font-size:12px;font-weight:900;color:#0f172a">${escapeHtml(title)}</p>${items.map((item) => `<p style="margin:6px 0;font-size:12px;line-height:1.5;color:#475569"><strong>${escapeHtml(item.source)}</strong> · ${escapeHtml(compactText(item.title, 145))} <a href="${escapeHtml(item.link)}" style="color:#0f766e;font-weight:800;text-decoration:none">Haberi aç →</a></p>`).join("")}</div>`;
}

function renderUniverseBars(pulse: VipUniversePulse, assetUrl: (symbol: string) => string) {
  if (pulse.alerts.length === 0) {
    return `<div style="padding:14px;border-radius:12px;background:#f8fafc;color:#475569;font-size:13px">Bugün güçlü bir alarm yok. Sabırlı kal. Tek bir sinyalle işlem yapma.</div>`;
  }

  const maximumChange = Math.max(1, ...pulse.alerts.map((alert) => Math.abs(alert.changePercent ?? 0)));
  return pulse.alerts.map((alert) => {
    const positive = (alert.changePercent ?? 0) >= 0;
    const width = alert.changePercent === null ? 42 : Math.max(10, Math.min(100, Math.abs(alert.changePercent) / maximumChange * 100));
    const color = alert.kind === "CROWDING" ? "#d97706" : positive ? "#0f766e" : "#be123c";
    return `<div style="margin-top:10px;padding:12px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">
      <table role="presentation" style="width:100%;border-collapse:collapse"><tr><td style="font-size:13px;font-weight:900;color:#0f172a">${escapeHtml(alert.symbol)} · ${escapeHtml(alert.label)}</td><td style="text-align:right;font-size:12px;font-weight:900;color:${color}">${escapeHtml(formatSignedPercent(alert.changePercent))}</td></tr></table>
      <div style="margin:8px 0;height:7px;border-radius:999px;background:#e2e8f0;overflow:hidden"><div style="width:${width.toFixed(0)}%;height:7px;border-radius:999px;background:${color}"></div></div>
      <p style="margin:0;font-size:11px;font-weight:800;color:${alert.status === "DOĞRULANDI" ? "#0f766e" : "#a16207"}">${escapeHtml(alert.status)}</p>
      <p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#475569">${escapeHtml(simpleAlertInstruction(alert))} <a href="${escapeHtml(assetUrl(alert.symbol))}" style="color:#0f766e;font-weight:800;text-decoration:none">Detay öğren →</a></p>
    </div>`;
  }).join("");
}

function renderAgentCards(agents: VipAgentDigest[], agentUrl: (slug: string) => string) {
  if (agents.length === 0) {
    return `<div style="padding:14px;border-radius:12px;background:#111827;color:#e2e8f0;font-size:13px">Bugün yeni işlem yapma. Bir sonraki doğrulanmış raporu bekle.</div>`;
  }

  return agents.map((agent) => {
    const decisions = agent.decisions.length > 0
      ? agent.decisions.map((decision) => `<div style="margin-top:9px;padding:10px;border-radius:10px;background:#ffffff;color:#0f172a">
          <p style="margin:0;font-size:12px;font-weight:900"><span style="color:${decision.action === "SELL" ? "#be123c" : decision.action === "BUY" ? "#0f766e" : "#a16207"}">${escapeHtml(decision.actionLabel)}</span> · ${escapeHtml(decision.symbol)} ${decision.priceUsd === null ? "" : `@ ${escapeHtml(formatPriceLevel(decision.priceUsd, decision.currency))}`}</p>
          <p style="margin:4px 0 0;font-size:11px;line-height:1.5;color:#475569">${escapeHtml(simpleDecisionAdvice(decision))}</p>
          ${decision.stopLoss !== null || decision.targetPrice !== null ? `<p style="margin:5px 0 0;font-size:11px;color:#64748b">Stop ${escapeHtml(formatPriceLevel(decision.stopLoss, decision.currency))} · Hedef ${escapeHtml(formatPriceLevel(decision.targetPrice, decision.currency))}</p>` : ""}
        </div>`).join("")
      : "";
    const diagnostics = [
      agent.hiddenDecisionCount > 0 ? `+${agent.hiddenDecisionCount} karar detayda` : "",
      agent.skippedCount > 0 ? `${agent.skippedCount} aday filtreden geçmedi` : "",
      agent.errorCount > 0 ? `${agent.errorCount} varlıkta veri doğrulanamadı` : "",
    ].filter(Boolean).join(" · ");

    return `<div style="margin-top:12px;padding:14px;border:1px solid #334155;border-radius:14px;background:#111827">
      <table role="presentation" style="width:100%;border-collapse:collapse"><tr><td><p style="margin:0;font-size:16px;font-weight:900;color:#ffffff">${escapeHtml(agent.name)}</p><p style="margin:2px 0 0;font-size:10px;font-weight:900;letter-spacing:.12em;color:#f5c96b">${escapeHtml(agent.riskProfile)}</p></td><td style="text-align:right;color:#99f6e4;font-size:12px;font-weight:900"><span style="display:block;font-size:8px;letter-spacing:.08em;color:#94a3b8">BAŞLANGIÇTAN BERİ</span>${escapeHtml(formatSignedPercent(agent.returnPercent))}<br><span style="font-weight:600;color:#94a3b8">${escapeHtml(formatUsd(agent.pnlUsd))}</span></td></tr></table>
      <div style="margin-top:10px;padding:11px;border:1px solid #2dd4bf55;border-radius:10px;background:#0f2f2f"><p style="margin:0;font-size:9px;font-weight:900;letter-spacing:.12em;color:#99f6e4">GÜNÜN KARARI</p><p style="margin:4px 0 0;font-size:14px;font-weight:900;color:#ffffff">${escapeHtml(agent.dailyActionLabel)}</p><p style="margin:4px 0 0;font-size:12px;line-height:1.5;color:#d1fae5">${escapeHtml(agent.dailyAdvice)}</p></div>
      ${decisions}
      ${diagnostics ? `<p style="margin:8px 0 0;font-size:10px;color:#94a3b8">${escapeHtml(diagnostics)}</p>` : ""}
      <p style="margin:10px 0 0"><a href="${escapeHtml(agentUrl(agent.slug))}" style="color:#99f6e4;font-size:12px;font-weight:900;text-decoration:none">${escapeHtml(agent.name)} detayını öğren →</a></p>
    </div>`;
  }).join("");
}

export function renderVipDailyDigest(input: VipDailyDigestInput) {
  const { report, macroReport, universePulse, agents, urls } = input;
  const topIdeas = report.ideas.slice(0, 3);
  const news = newsGroups(macroReport?.newsItems ?? []);
  const mainAlert = universePulse.alerts[0];
  const leadIdea = topIdeas[0];
  const directionSentence = mainAlert
    ? simpleDirectionInstruction(mainAlert)
    : leadIdea?.stance === "AL"
      ? `${leadIdea.symbol} giriş bandına gelirse fırsat oluşabilir. Bandın üstünde alma.`
      : "Net yön yok. Nakit tut. Yeni sinyali bekle.";
  const simpleGuidance = [
    {
      label: "TAKİP ET",
      text: `${compactText(macroReport?.marketRegime ?? "Piyasa yönü net değil", 90)}. Dolar, altın, petrol ve ana endeksleri takip et.`,
    },
    {
      label: "DİKKAT ET",
      text: mainAlert ? simpleAlertInstruction(mainAlert) : "Bugün güçlü bir alarm yok. Sabırlı kal.",
    },
    {
      label: "YAPMA",
      text: "Hızlı yükselen fiyatın peşinden gitme. Stop olmadan işlem yapma.",
    },
    {
      label: "OLASI YÖN",
      text: directionSentence,
    },
  ];
  const alertSubject = universePulse.totalAlertCount > 0 ? `${universePulse.totalAlertCount} özel durum` : "seçici görünüm";
  const subject = `Enbilir VIP Günlük Özet · ${alertSubject}`;

  const textLines = [
    `Merhaba ${input.recipientName},`,
    "",
    `ENBİLİR VIP · ${report.periodKey} · BUGÜNÜN KISA PLANI`,
    ...simpleGuidance.map((item) => `${item.label}: ${item.text}`),
    macroReport?.riskAppetite ? `RİSK İŞTAHI: ${compactText(macroReport.riskAppetite, 100)}` : "",
    report.fallbackUsed ? "VERİ NOTU: Bazı kaynaklar sınırlı. Temkinli kal." : "",
    "",
    "BUGÜNÜN KAYNAKLI HABERLERİ",
    ...(news.macro.length + news.micro.length > 0
      ? [...[...news.macro, ...news.micro].map((item) => `- ${item.source}: ${compactText(item.title, 120)} · ${item.link}`)]
      : ["- Bugün e-posta eşiğini geçen yeni haber yok."]),
    macroReport && urls.macroReport ? `Makro detay: ${urls.macroReport}` : "",
    "",
    `KATMAN 2 · ${universePulse.universeSize} VARLIK ERKEN UYARI RADARI`,
    `${universePulse.verifiedQuoteCount} fiyat doğrulandı. ${universePulse.totalAlertCount} özel durum bulundu.`,
    ...(universePulse.alerts.length > 0
      ? universePulse.alerts.map((alert) => `- ${alert.symbol} · ${formatSignedPercent(alert.changePercent)} · ${simpleAlertInstruction(alert)} · ${urls.asset(alert.symbol)}`)
      : ["- Güçlü alarm yok. Sabırlı kal."]),
    "",
    "KATMAN 3 · EN GÜÇLÜ ASİMETRİK FİKİRLER",
    ...topIdeas.map((idea) => `- #${idea.rank} ${idea.symbol} · ${idea.stance} · ${simpleIdeaInstruction(idea)} Hedef ${formatPriceLevel(idea.targetPrice, idea.currency)}. Güven ${idea.confidenceScore}/100. Risk ${idea.riskScore}/100. · ${urls.idea(idea.id)}`),
    `Tam VIP raporu: ${urls.report}`,
    "",
    "ÖZEL BÖLÜM · SABİT, OLGUN VE YILDIRIM'IN GÜNLÜK SANAL KARARLARI",
    "Kartlardaki K/Z, 1.000.000 USD performans tabanına göre başlangıçtan beri toplamdır.",
    ...agents.flatMap((agent) => [
      `${agent.name} · ${agent.riskProfile} · Başlangıçtan beri ${formatSignedPercent(agent.returnPercent)} / ${formatUsd(agent.pnlUsd)}`,
      `GÜNÜN KARARI: ${agent.dailyActionLabel}. ${agent.dailyAdvice}`,
      ...(agent.decisions.length > 0
        ? agent.decisions.map((decision) => `- ${decision.actionLabel} ${decision.symbol} ${decision.priceUsd === null ? "" : `@ ${formatPriceLevel(decision.priceUsd, decision.currency)}`} · ${simpleDecisionAdvice(decision)} Stop ${formatPriceLevel(decision.stopLoss, decision.currency)}. Hedef ${formatPriceLevel(decision.targetPrice, decision.currency)}.`)
        : []),
      agent.errorCount > 0 ? `- ${agent.errorCount} varlıkta veri doğrulanamadığı için eylem üretilmedi.` : "",
      `Detay: ${urls.agent(agent.slug)}`,
    ]),
    "",
    "Sanal ajan kararları gerçek emir değildir. Son karar ve sorumluluk kullanıcıya aittir.",
    report.disclaimer,
  ];

  const ideaCards = topIdeas.map((idea) => `<div style="margin-top:10px;padding:13px;border:1px solid #e2e8f0;border-radius:12px;background:#ffffff">
    <table role="presentation" style="width:100%;border-collapse:collapse"><tr><td><p style="margin:0;font-size:14px;font-weight:900;color:#0f172a">#${idea.rank} ${escapeHtml(idea.symbol)} · ${escapeHtml(idea.stance)}</p></td><td style="text-align:right;font-size:11px;color:#64748b">Güven ${idea.confidenceScore}/100 · Risk ${idea.riskScore}/100</td></tr></table>
    <p style="margin:7px 0 0;font-size:12px;line-height:1.55;color:#334155">${escapeHtml(simpleIdeaInstruction(idea))}</p>
    <p style="margin:7px 0 0;font-size:11px;color:#64748b">Giriş ${escapeHtml(formatPriceLevel(idea.entryLow, idea.currency))}–${escapeHtml(formatPriceLevel(idea.entryHigh, idea.currency))} · Stop ${escapeHtml(formatPriceLevel(idea.stopLoss, idea.currency))} · Hedef ${escapeHtml(formatPriceLevel(idea.targetPrice, idea.currency))}</p>
    <p style="margin:8px 0 0"><a href="${escapeHtml(urls.idea(idea.id))}" style="color:#0f766e;font-size:12px;font-weight:900;text-decoration:none">Detay öğren →</a></p>
  </div>`).join("");

  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;background:#eef2f5"><div style="display:none;max-height:0;overflow:hidden">Kısa VIP planı, ${universePulse.universeSize} varlık radarı ve üç özel ajanın günlük kararı.</div>
    <div style="max-width:720px;margin:0 auto;padding:20px 12px;font-family:Arial,sans-serif;color:#172033">
      <div style="overflow:hidden;border-radius:20px;background:#071923;box-shadow:0 16px 45px rgba(15,23,42,.16)">
        <div style="padding:24px;background:linear-gradient(135deg,#071923,#123a3b)">
          <p style="margin:0;font-size:11px;font-weight:900;letter-spacing:.16em;color:#99f6e4">ENBİLİR VIP · ${escapeHtml(report.periodKey)}</p>
          <h1 style="margin:8px 0 6px;font-size:26px;line-height:1.15;color:#ffffff">Bugünün kısa planı</h1>
          <p style="margin:0;font-size:14px;line-height:1.6;color:#cbd5e1">Merhaba ${escapeHtml(input.recipientName)}. Önemli noktaları kısa cümlelerle hazırladık.</p>
          <div style="margin-top:14px"><span style="display:inline-block;margin:0 6px 6px 0;padding:6px 9px;border-radius:999px;background:rgba(153,246,228,.12);color:#99f6e4;font-size:11px;font-weight:800">${escapeHtml(macroReport?.marketRegime ?? "Seçici piyasa rejimi")}</span><span style="display:inline-block;margin:0 6px 6px 0;padding:6px 9px;border-radius:999px;background:rgba(245,201,107,.12);color:#f5c96b;font-size:11px;font-weight:800">${escapeHtml(macroReport?.riskAppetite ?? "Risk iştahı teyit bekliyor")}</span>${report.fallbackUsed ? `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 9px;border-radius:999px;background:rgba(251,113,133,.14);color:#fecdd3;font-size:11px;font-weight:800">Kaynak araştırması sınırlı · temkinli mod</span>` : ""}</div>
        </div>

        <div style="padding:22px;background:#ffffff">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.14em;color:#0f766e">BUGÜN NE YAPMALI?</p>
          <h2 style="margin:6px 0 12px;font-size:20px;color:#0f172a">Dört kısa cümle</h2>
          ${simpleGuidance.map((item, index) => `<div style="${index > 0 ? "margin-top:8px;" : ""}padding:11px 13px;border-left:4px solid ${index === 2 ? "#be123c" : index === 3 ? "#d97706" : "#0f766e"};background:${index === 2 ? "#fff1f2" : index === 3 ? "#fffbeb" : "#f0fdfa"}"><p style="margin:0 0 3px;font-size:10px;font-weight:900;color:${index === 2 ? "#be123c" : index === 3 ? "#a16207" : "#0f766e"}">${escapeHtml(item.label)}</p><p style="margin:0;font-size:13px;line-height:1.5;color:#334155">${escapeHtml(item.text)}</p></div>`).join("")}
          ${renderNewsList("Makro haberler", news.macro)}${renderNewsList("Mikro / sektör haberleri", news.micro)}
          ${macroReport && urls.macroReport ? `<p style="margin:14px 0 0">${htmlButton("Makro detayı öğren", urls.macroReport, true)}</p>` : ""}
        </div>

        <div style="padding:22px;background:#f8fafc;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.14em;color:#0f766e">KATMAN 2 · ERKEN UYARI RADARI</p>
          <h2 style="margin:6px 0 5px;font-size:20px;color:#0f172a">${universePulse.universeSize} varlıkta özel durum taraması</h2>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#64748b">${universePulse.verifiedQuoteCount} fiyat doğrulandı. ${universePulse.totalAlertCount} özel durum bulundu. Aşağıda yalnız en önemli kayıtlar var.</p>
          ${renderUniverseBars(universePulse, urls.asset)}
        </div>

        <div style="padding:22px;background:#ffffff;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.14em;color:#a16207">KATMAN 3 · ASİMETRİK FIRSATLAR</p>
          <h2 style="margin:6px 0 5px;font-size:20px;color:#0f172a">Yalnız en güçlü üç fikir</h2>
          <p style="margin:0;font-size:12px;color:#64748b">Giriş, stop ve hedef seviyelerine uy. Ayrıntı için raporu aç.</p>
          ${ideaCards || `<p style="margin:12px 0;color:#64748b;font-size:13px">Bugün kanıt eşiğini geçen fikir bulunmadı.</p>`}
          <p style="margin:14px 0 0">${htmlButton("Tam VIP raporunu aç", urls.report)}</p>
        </div>

        <div style="padding:22px;background:#071923;border-top:1px solid #334155">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.14em;color:#f5c96b">ÖZEL BÖLÜM</p>
          <h2 style="margin:6px 0 5px;font-size:20px;color:#ffffff">SABİT, OLGUN ve YILDIRIM</h2>
          <p style="margin:0;font-size:12px;line-height:1.6;color:#cbd5e1">Her kartta bugünün kararı var. Eski kararlar kullanılmaz. K/Z, 1.000.000 USD üzerinden hesaplanır.</p>
          ${renderAgentCards(agents, urls.agent)}
          <p style="margin:14px 0 0">${htmlButton("Tüm ajan masasını aç", urls.agents, true)}</p>
        </div>

        <div style="padding:18px 22px;background:#ffffff;border-top:1px solid #e2e8f0">
          <p style="margin:0;font-size:11px;line-height:1.55;color:#64748b">SABİT, OLGUN ve YILDIRIM sanal portföy ajanlarıdır; gerçek emir göndermez. ${escapeHtml(report.disclaimer)}</p>
          <p style="margin:10px 0 0;font-size:11px;color:#64748b">Dr. Hakan Ünsal tarafından eğitilmiş yapay zeka tarafından üretilmiştir. Yapay zeka hata yapabilir; son karar ve sorumluluk kullanıcıya aittir.</p>
          <p style="margin:12px 0 0"><a href="${escapeHtml(urls.home)}" style="color:#0f766e;font-size:12px;font-weight:900;text-decoration:none">enbilir.com</a></p>
        </div>
      </div>
    </div></body></html>`;

  return { subject, text: textLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(), html };
}
