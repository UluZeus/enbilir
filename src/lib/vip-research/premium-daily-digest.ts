import type {
  VipAgentDigest,
  VipAgentDigestDecision,
  VipDailyDigestInput,
  VipDigestIdea,
  VipDigestNewsItem,
  VipUniverseAlert,
} from "@/lib/vip-research/daily-digest";
import type { VipEmailChart } from "@/lib/vip-research/email-charts";

const MACRO_NEWS_CATEGORIES = new Set(["macro", "turkey", "fx", "energy", "metals", "asia"]);

function finite(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
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
  if (sentence && sentence.length >= maximumLength * 0.45) return sentence;

  const lastSpace = clipped.lastIndexOf(" ");
  return `${clipped.slice(0, lastSpace > maximumLength * 0.65 ? lastSpace : maximumLength).trim()}…`;
}

function readableExcerpt(value: string, maximumSentences: number, maximumSentenceLength: number) {
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized) return "";

  const sentences = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
  return sentences
    .slice(0, maximumSentences)
    .map((sentence) => compactText(sentence.trim(), maximumSentenceLength))
    .filter(Boolean)
    .join(" ");
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
  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.abs(value) < 10 ? 4 : 2,
  }).format(value)} ${normalizedCurrency}`;
}

function formatChartPrice(value: number | null) {
  if (!finite(value)) return "Veri bekleniyor";
  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: Math.abs(value) < 10 ? 2 : 0,
    maximumFractionDigits: Math.abs(value) < 10 ? 4 : 2,
  }).format(value);
}

function formatSignedPercent(value: number | null) {
  if (!finite(value)) return "—";
  const formatted = new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: Math.abs(value) < 1 ? 2 : 1,
    maximumFractionDigits: Math.abs(value) < 1 ? 2 : 1,
  }).format(value);
  return `${value > 0 ? "+" : ""}${formatted}%`;
}

function safeExternalUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function simpleAlertInstruction(alert: VipUniverseAlert) {
  if (alert.kind === "BREAKOUT") return `${alert.symbol} hacimli kırılım yaptı. Hacmi takip et. Teyit yoksa alma.`;
  if (alert.kind === "DIVERGENCE") {
    return alert.label.toLocaleLowerCase("tr-TR").includes("negatif")
      ? `${alert.symbol} için negatif uyumsuzluk var. Düşüş riski arttı. Yeni alım yapma.`
      : `${alert.symbol} için pozitif uyumsuzluk var. Toparlanma olabilir. İkinci sinyali bekle.`;
  }
  if (alert.kind === "CROWDING") return `${alert.symbol} kalabalık görünüyor. Düzeltme riski arttı. Fiyatı kovalama.`;
  if (alert.kind === "WATCH") return `${alert.symbol} kritik seviyeye yaklaştı. Teyit gelmeden işlem yapma.`;
  if (finite(alert.changePercent) && alert.changePercent > 0) return `${alert.symbol} hızlı yükseldi. Fiyatı kovalama. Hacmi takip et.`;
  if (finite(alert.changePercent) && alert.changePercent < 0) return `${alert.symbol} hızlı düştü. Yeni işlem için bekle. Stop planını koru.`;
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
  if (finite(alert.changePercent) && alert.changePercent > 0) return `${alert.symbol} artabilir. Hacmi takip et.`;
  if (finite(alert.changePercent) && alert.changePercent < 0) return `${alert.symbol} düşebilir. Acele etme.`;
  return `${alert.symbol} için yön net değil. Teyit bekle.`;
}

function simpleIdeaInstruction(idea: VipDigestIdea) {
  const entry = `${formatPriceLevel(idea.entryLow, idea.currency)}–${formatPriceLevel(idea.entryHigh, idea.currency)}`;
  const stop = formatPriceLevel(idea.stopLoss, idea.currency);

  if (idea.stance === "AL") return `${entry} aralığını bekle. Fiyatı kovalama. ${stop} altında çık.`;
  if (idea.stance === "SAT" || idea.stance === "UZAK_DUR") return `Yeni işlem açma. ${stop} seviyesini risk sınırı olarak izle.`;
  return `${entry} aralığını izle. Teyit gelmeden işlem yapma.`;
}

function simpleDecisionAdvice(decision: VipAgentDigestDecision) {
  if (decision.action === "SELL") return `${decision.symbol} pozisyonunu kapat. Yeni giriş için tekrar teyit bekle.`;
  if (decision.action === "BUY") {
    const entry = decision.entryLow !== null && decision.entryHigh !== null
      ? `${formatPriceLevel(decision.entryLow, decision.currency)}–${formatPriceLevel(decision.entryHigh, decision.currency)}`
      : null;
    return `${decision.symbol} için ${entry ? `yalnız ${entry} aralığında al` : "giriş seviyesini bekle"}. Stop olmadan işlem yapma.`;
  }
  return `${decision.symbol} pozisyonunu tut. Stop ve hedef planını değiştirme.`;
}

function formatPeriod(periodKey: string) {
  const parsed = new Date(`${periodKey}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return periodKey;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(parsed);
}

function renderButton(label: string, url: string, secondary = false) {
  const background = secondary ? "#ffffff" : "#b8892f";
  const color = secondary ? "#0f766e" : "#ffffff";
  const border = secondary ? "1px solid #b8c6c9" : "1px solid #b8892f";

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="${background}" style="border:${border};border-radius:10px"><a href="${escapeHtml(url)}" style="display:inline-block;padding:11px 17px;color:${color};font-family:Arial,sans-serif;font-size:12px;font-weight:800;line-height:1.2;text-decoration:none">${escapeHtml(label)}</a></td></tr></table>`;
}

function newsGroups(newsItems: VipDigestNewsItem[]) {
  const unique = new Map<string, VipDigestNewsItem>();
  for (const item of newsItems) {
    const link = safeExternalUrl(item.link);
    if (!link || !item.title.trim()) continue;
    const key = item.title.trim().toLocaleLowerCase("tr-TR");
    if (!unique.has(key)) unique.set(key, { ...item, link });
  }
  const items = Array.from(unique.values());
  return {
    macro: items.filter((item) => MACRO_NEWS_CATEGORIES.has(item.category ?? "")).slice(0, 2),
    micro: items.filter((item) => !MACRO_NEWS_CATEGORIES.has(item.category ?? "")).slice(0, 2),
  };
}

function newsImpact(item: VipDigestNewsItem) {
  if (["energy", "metals"].includes(item.category ?? "")) return "Emtia fiyatlarını ve şirket maliyetlerini etkileyebilir.";
  if (["macro", "turkey", "fx", "asia"].includes(item.category ?? "")) return "Faiz, kur ve risk iştahını etkileyebilir.";
  return "İlgili sektörün fiyatlamasını etkileyebilir.";
}

function renderNewsList(title: string, items: VipDigestNewsItem[]) {
  if (items.length === 0) return "";
  const rows = items.map((item, index) => `<tr><td style="${index > 0 ? "padding-top:13px;border-top:1px solid #e5e7eb;" : ""}padding-bottom:13px">
    <p style="margin:0 0 4px;font-size:10px;font-weight:800;letter-spacing:.08em;color:#8a6418">${escapeHtml(item.source.toUpperCase())}</p>
    <p style="margin:0;font-size:14px;font-weight:800;line-height:1.45;color:#172033">${escapeHtml(compactText(item.title, 170))}</p>
    <p style="margin:5px 0 0;font-size:12px;line-height:1.5;color:#5f6b78">${escapeHtml(newsImpact(item))} <a href="${escapeHtml(item.link)}" style="color:#0f766e;font-weight:800;text-decoration:none">Kaynağı aç →</a></p>
  </td></tr>`).join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;border-collapse:collapse"><tr><td style="padding-bottom:8px;font-size:12px;font-weight:900;color:#0f766e">${escapeHtml(title)}</td></tr>${rows}</table>`;
}

function renderGuidanceCards(items: Array<{ label: string; text: string }>) {
  const palettes = [
    { border: "#0f766e", background: "#edf8f6", label: "#0f766e" },
    { border: "#b8892f", background: "#fff8e8", label: "#8a6418" },
    { border: "#c2415d", background: "#fff1f3", label: "#a62f49" },
    { border: "#436d8e", background: "#eef5fa", label: "#315b7a" },
  ];
  const cell = (item: { label: string; text: string }, index: number) => {
    const palette = palettes[index] ?? palettes[0];
    return `<td class="stack" width="50%" valign="top" style="padding:0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${palette.background}" style="border-collapse:separate;border-left:4px solid ${palette.border};border-radius:10px"><tr><td style="padding:13px 14px"><p style="margin:0 0 4px;font-size:10px;font-weight:900;letter-spacing:.11em;color:${palette.label}">${escapeHtml(item.label)}</p><p style="margin:0;font-size:13px;line-height:1.5;color:#2f3b48">${escapeHtml(item.text)}</p></td></tr></table></td>`;
  };

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate"><tr>${cell(items[0], 0)}<td class="stack-spacer" width="10">&nbsp;</td>${cell(items[1], 1)}</tr><tr><td colspan="3" height="10" style="height:10px;font-size:1px;line-height:1px">&nbsp;</td></tr><tr>${cell(items[2], 2)}<td class="stack-spacer" width="10">&nbsp;</td>${cell(items[3], 3)}</tr></table>`;
}

function chartDirection(chart: VipEmailChart) {
  if (chart.direction === "YUKARI") return "Yükseliş eğilimi";
  if (chart.direction === "ASAGI") return "Düşüş eğilimi";
  if (chart.direction === "YATAY") return "Yatay görünüm";
  return "Veri bekleniyor";
}

function renderChartCard(chart: VipEmailChart) {
  const positive = (chart.changePercent3d ?? 0) >= 0;
  const color = chart.changePercent3d === null ? "#64748b" : positive ? "#0f766e" : "#b83250";
  const chartImage = chart.imageSrc
    ? `<img class="chart-image" src="${escapeHtml(chart.imageSrc)}" width="302" height="91" alt="${escapeHtml(chart.imageAlt)}" style="display:block;width:100%;max-width:302px;height:auto;border:0;border-radius:9px" />`
    : `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f1f4f6" style="height:91px;border-collapse:separate;border-radius:9px"><tr><td align="center" style="height:91px;font-size:11px;font-weight:800;color:#778391">Grafik verisi bir sonraki taramada yenilenecek.</td></tr></table>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border:1px solid #dfe5e8;border-collapse:separate;border-radius:12px"><tr><td style="padding:13px">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:15px;font-weight:900;color:#172033">${escapeHtml(chart.label)}</p><p style="margin:3px 0 0;font-size:11px;color:#697684">Son: ${escapeHtml(formatChartPrice(chart.lastPrice))}</p></td><td align="right" valign="top" style="font-size:13px;font-weight:900;color:${color}">${escapeHtml(formatSignedPercent(chart.changePercent3d))}</td></tr></table>
    <div style="height:9px;line-height:9px;font-size:1px">&nbsp;</div>${chartImage}
    <p style="margin:8px 0 0;font-size:11px;font-weight:800;color:${color}">${escapeHtml(chartDirection(chart))} · son 3 gün</p>
  </td></tr></table>`;
}

function renderChartBoard(charts: VipEmailChart[]) {
  if (charts.length === 0) return `<table role="presentation" width="100%" bgcolor="#f3f5f6" style="border-radius:10px"><tr><td style="padding:14px;font-size:13px;color:#5f6b78">Grafik verisi hazırlanıyor. Piyasa özeti aşağıda açık olarak yer alıyor.</td></tr></table>`;
  const rows: string[] = [];

  for (let index = 0; index < charts.length; index += 2) {
    const left = charts[index];
    const right = charts[index + 1];
    rows.push(`<tr><td class="stack" width="50%" valign="top">${renderChartCard(left)}</td><td class="stack-spacer" width="12">&nbsp;</td>${right ? `<td class="stack" width="50%" valign="top">${renderChartCard(right)}</td>` : `<td class="hide-mobile" width="50%">&nbsp;</td>`}</tr>${index + 2 < charts.length ? `<tr><td colspan="3" height="12" style="height:12px;font-size:1px;line-height:1px">&nbsp;</td></tr>` : ""}`);
  }

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:separate">${rows.join("")}</table>`;
}

function agentPalette(name: string) {
  if (name === "SABİT") return { accent: "#3b6f91", pale: "#eef5fa", border: "#b9cfdd", monogram: "S" };
  if (name === "YILDIRIM") return { accent: "#c77722", pale: "#fff5e8", border: "#e7c79d", monogram: "Y" };
  return { accent: "#0f766e", pale: "#edf8f6", border: "#acd5cf", monogram: "O" };
}

function renderAgentDecision(decision: VipAgentDigestDecision, accent: string) {
  const actionColor = decision.action === "SELL" ? "#b83250" : decision.action === "BUY" ? "#0f766e" : "#8a6418";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f9fa" style="margin-top:10px;border:1px solid #e0e5e8;border-collapse:separate;border-radius:9px"><tr><td style="padding:11px 12px">
    <p style="margin:0;font-size:12px;font-weight:900;color:${actionColor}">${escapeHtml(decision.actionLabel)} · ${escapeHtml(decision.symbol)}${decision.priceUsd === null ? "" : ` @ ${escapeHtml(formatPriceLevel(decision.priceUsd, decision.currency))}`}</p>
    <p style="margin:5px 0 0;font-size:12px;line-height:1.55;color:#485563"><strong>Neden:</strong> ${escapeHtml(readableExcerpt(decision.reason, 2, 125))}</p>
    <p style="margin:5px 0 0;font-size:11px;line-height:1.5;color:${accent}"><strong>Plan:</strong> ${escapeHtml(simpleDecisionAdvice(decision))}</p>
    ${decision.stopLoss !== null || decision.targetPrice !== null ? `<p style="margin:6px 0 0;font-size:11px;font-weight:800;color:#697684">Stop ${escapeHtml(formatPriceLevel(decision.stopLoss, decision.currency))} · Hedef ${escapeHtml(formatPriceLevel(decision.targetPrice, decision.currency))}</p>` : ""}
  </td></tr></table>`;
}

function renderAgentCards(agents: VipAgentDigest[]) {
  if (agents.length === 0) return `<table role="presentation" width="100%" bgcolor="#ffffff" style="border-radius:10px"><tr><td style="padding:15px;font-size:13px;color:#475569">Bugün doğrulanmış ajan verisi yok. Yeni işlem yapma.</td></tr></table>`;

  return agents.map((agent) => {
    const palette = agentPalette(agent.name);
    const returnColor = !finite(agent.returnPercent) ? "#64748b" : agent.returnPercent >= 0 ? "#0f766e" : "#b83250";
    const decisions = agent.decisions.map((decision) => renderAgentDecision(decision, palette.accent)).join("");
    const diagnostics = [
      agent.hiddenDecisionCount > 0 ? `+${agent.hiddenDecisionCount} karar daha` : "",
      agent.skippedCount > 0 ? `${agent.skippedCount} aday eşiği geçmedi` : "",
      agent.errorCount > 0 ? `${agent.errorCount} varlıkta veri doğrulanamadı` : "",
    ].filter(Boolean).join(" · ");
    const reason = readableExcerpt(agent.summary || agent.dailyAdvice, 2, 125);
    const normalizedSummary = agent.summary.trim().toLocaleLowerCase("tr-TR");
    const normalizedAdvice = agent.dailyAdvice.trim().toLocaleLowerCase("tr-TR");
    const showSeparateReason = Boolean(normalizedSummary) && normalizedSummary !== normalizedAdvice;

    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin-top:14px;border:1px solid ${palette.border};border-top:4px solid ${palette.accent};border-collapse:separate;border-radius:13px"><tr><td style="padding:16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="46" valign="top"><table role="presentation" width="40" height="40" bgcolor="${palette.accent}" style="border-radius:12px"><tr><td align="center" valign="middle" style="font-size:18px;font-weight:900;color:#ffffff">${palette.monogram}</td></tr></table></td><td valign="top"><p style="margin:0;font-size:18px;font-weight:900;color:#172033">${escapeHtml(agent.name)}</p><p style="margin:3px 0 0;font-size:10px;font-weight:900;letter-spacing:.1em;color:${palette.accent}">${escapeHtml(agent.riskProfile)}</p></td><td align="right" valign="top"><p style="margin:0;font-size:9px;font-weight:800;letter-spacing:.08em;color:#778391">BAŞLANGIÇTAN BERİ</p><p style="margin:4px 0 0;font-size:15px;font-weight:900;color:${returnColor}">${escapeHtml(formatSignedPercent(agent.returnPercent))}</p><p style="margin:2px 0 0;font-size:11px;color:#697684">${escapeHtml(formatUsd(agent.pnlUsd))}</p></td></tr></table>
      <p style="margin:10px 0 0;font-size:12px;line-height:1.55;color:#697684">${escapeHtml(readableExcerpt(agent.description, 1, 150))}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${palette.pale}" style="margin-top:12px;border-left:4px solid ${palette.accent};border-collapse:separate;border-radius:9px"><tr><td style="padding:12px 13px"><p style="margin:0;font-size:9px;font-weight:900;letter-spacing:.11em;color:${palette.accent}">GÜNÜN KARARI</p><p style="margin:5px 0 0;font-size:16px;font-weight:900;color:#172033">${escapeHtml(agent.dailyActionLabel)}</p><p style="margin:5px 0 0;font-size:13px;line-height:1.55;color:#334155">${escapeHtml(agent.dailyAdvice)}</p></td></tr></table>
      ${showSeparateReason ? `<p style="margin:11px 0 0;font-size:12px;line-height:1.55;color:#485563"><strong>Kararın nedeni:</strong> ${escapeHtml(reason)}</p>` : ""}
      ${decisions}
      ${diagnostics ? `<p style="margin:9px 0 0;font-size:10px;color:#778391">${escapeHtml(diagnostics)}</p>` : ""}
    </td></tr></table>`;
  }).join("");
}

function renderScoreBar(label: string, value: number, color: string) {
  const width = Math.max(1, Math.min(100, value));
  return `<td class="stack" width="50%" valign="top"><p style="margin:0 0 5px;font-size:10px;font-weight:800;color:#697684">${escapeHtml(label)} <strong style="color:#172033">${value}/100</strong></p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#e7ebee" style="border-radius:99px"><tr><td width="${width}%" height="6" bgcolor="${color}" style="height:6px;border-radius:99px;font-size:1px;line-height:1px">&nbsp;</td><td width="${100 - width}%" height="6" style="height:6px;font-size:1px;line-height:1px">&nbsp;</td></tr></table></td>`;
}

function renderIdeaCards(ideas: VipDigestIdea[]) {
  if (ideas.length === 0) return `<table role="presentation" width="100%" bgcolor="#f5f7f8" style="border-radius:10px"><tr><td style="padding:15px;font-size:13px;color:#5f6b78">Bugün kanıt eşiğini geçen yeni fikir yok. Nakit tut.</td></tr></table>`;

  return ideas.map((idea) => {
    const negative = idea.stance === "SAT" || idea.stance === "UZAK_DUR";
    const accent = negative ? "#b83250" : idea.stance === "AL" ? "#0f766e" : "#b8892f";
    const pale = negative ? "#fff1f3" : idea.stance === "AL" ? "#edf8f6" : "#fff8e8";
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin-top:14px;border:1px solid #dfe5e8;border-left:5px solid ${accent};border-collapse:separate;border-radius:12px"><tr><td style="padding:16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.1em;color:#8a6418">#${idea.rank} · ${escapeHtml(idea.displayName)}</p><p style="margin:4px 0 0;font-size:20px;font-weight:900;color:#172033">${escapeHtml(idea.symbol)}</p></td><td align="right" valign="top"><span style="display:inline-block;padding:6px 10px;border-radius:99px;background:${pale};color:${accent};font-size:11px;font-weight:900">${escapeHtml(idea.stance)}</span></td></tr></table>
      <p style="margin:12px 0 0;font-size:14px;line-height:1.6;color:#3e4b59"><strong>Neden öne çıktı?</strong> ${escapeHtml(readableExcerpt(idea.thesisSummary, 2, 135))}</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${pale}" style="margin-top:11px;border-radius:9px"><tr><td style="padding:11px 12px;font-size:12px;line-height:1.55;color:#334155"><strong style="color:${accent}">Net plan:</strong> ${escapeHtml(simpleIdeaInstruction(idea))}</td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:12px"><tr>${renderScoreBar("GÜVEN", idea.confidenceScore, "#0f766e")}<td class="stack-spacer" width="12">&nbsp;</td>${renderScoreBar("RİSK", idea.riskScore, idea.riskScore >= 60 ? "#b83250" : "#b8892f")}</tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f9fa" style="margin-top:13px;border:1px solid #e3e7ea;border-collapse:separate;border-radius:9px"><tr><td width="34%" valign="top" style="padding:10px 8px;text-align:center;border-right:1px solid #e3e7ea"><p style="margin:0;font-size:9px;font-weight:800;color:#778391">GİRİŞ</p><p style="margin:4px 0 0;font-size:11px;font-weight:900;line-height:1.45;color:#172033">${escapeHtml(formatPriceLevel(idea.entryLow, idea.currency))}<br><span style="color:#778391">–</span><br>${escapeHtml(formatPriceLevel(idea.entryHigh, idea.currency))}</p></td><td width="33%" valign="top" style="padding:10px 8px;text-align:center;border-right:1px solid #e3e7ea"><p style="margin:0;font-size:9px;font-weight:800;color:#778391">STOP</p><p style="margin:4px 0 0;font-size:11px;font-weight:900;color:#b83250">${escapeHtml(formatPriceLevel(idea.stopLoss, idea.currency))}</p></td><td width="33%" valign="top" style="padding:10px 8px;text-align:center"><p style="margin:0;font-size:9px;font-weight:800;color:#778391">HEDEF</p><p style="margin:4px 0 0;font-size:11px;font-weight:900;color:#0f766e">${escapeHtml(formatPriceLevel(idea.targetPrice, idea.currency))}</p></td></tr></table>
    </td></tr></table>`;
  }).join("");
}

function alertAccent(alert: VipUniverseAlert) {
  if (alert.kind === "DIVERGENCE") {
    return alert.label.toLocaleLowerCase("tr-TR").includes("negatif") ? "#b83250" : "#0f766e";
  }
  if (alert.kind === "CROWDING") return "#b8892f";
  if (alert.kind === "WATCH") return "#3b6f91";
  if (alert.kind === "BREAKOUT") return "#0f766e";
  return (alert.changePercent ?? 0) >= 0 ? "#0f766e" : "#b83250";
}

function renderAlertCards(alerts: VipUniverseAlert[]) {
  if (alerts.length === 0) return `<table role="presentation" width="100%" bgcolor="#f5f7f8" style="border-radius:10px"><tr><td style="padding:15px;font-size:13px;color:#5f6b78">Bugün güçlü bir alarm yok. Sabırlı kal. Tek sinyalle işlem yapma.</td></tr></table>`;
  const maximumChange = Math.max(1, ...alerts.map((alert) => Math.abs(alert.changePercent ?? 0)));

  return alerts.map((alert) => {
    const width = alert.changePercent === null ? 35 : Math.max(8, Math.min(100, Math.abs(alert.changePercent) / maximumChange * 100));
    const color = alertAccent(alert);
    return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="margin-top:12px;border:1px solid #dfe5e8;border-collapse:separate;border-radius:11px"><tr><td style="padding:13px 14px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td><p style="margin:0;font-size:14px;font-weight:900;color:#172033">${escapeHtml(alert.symbol)} · ${escapeHtml(alert.label)}</p><p style="margin:3px 0 0;font-size:10px;font-weight:800;color:${alert.status === "DOĞRULANDI" ? "#0f766e" : "#8a6418"}">${escapeHtml(alert.status)}</p></td><td align="right" valign="top" style="font-size:14px;font-weight:900;color:${color}">${escapeHtml(formatSignedPercent(alert.changePercent))}</td></tr></table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#e7ebee" style="margin-top:9px;border-radius:99px"><tr><td width="${width.toFixed(0)}%" height="6" bgcolor="${color}" style="height:6px;border-radius:99px;font-size:1px;line-height:1px">&nbsp;</td><td width="${(100 - width).toFixed(0)}%" height="6" style="height:6px;font-size:1px;line-height:1px">&nbsp;</td></tr></table>
      <p style="margin:9px 0 0;font-size:12px;line-height:1.55;color:#52606d"><strong>Ne oldu?</strong> ${escapeHtml(readableExcerpt(alert.commentary, 2, 120))}</p>
      <p style="margin:5px 0 0;font-size:13px;line-height:1.55;color:${color}"><strong>Ne yapmalı?</strong> ${escapeHtml(simpleAlertInstruction(alert))}</p>
    </td></tr></table>`;
  }).join("");
}

export function renderPremiumVipDailyDigest(input: VipDailyDigestInput) {
  const { report, macroReport, universePulse, agents, urls } = input;
  const ideas = report.ideas.slice(0, 3);
  const news = newsGroups(macroReport?.newsItems ?? []);
  const mainAlert = universePulse.alerts[0];
  const leadIdea = ideas[0];
  const macroCommentary = macroReport
    ? [
        `Piyasanın genel yönü: ${readableExcerpt(macroReport.marketRegime || "Net değil.", 1, 90)}`,
        `Risk alma isteği: ${readableExcerpt(macroReport.riskAppetite || "Dengeli.", 1, 90)}`,
        "Dolar, altın, petrol ve ana endeksleri birlikte izle.",
      ].join(" ")
    : readableExcerpt(report.marketContext, 3, 125);
  const keyTakeaways = (macroReport?.keyTakeaways ?? []).filter(Boolean).slice(0, 3);
  const charts = macroReport?.chartAssets ?? [];
  const chartHeading = charts.length === 11
    ? "Takip listesindeki 11 varlık"
    : charts.length > 0
      ? `Takip listesindeki ${charts.length} varlık`
      : "Grafikler hazırlanıyor";
  const directionSentence = mainAlert
    ? simpleDirectionInstruction(mainAlert)
    : leadIdea?.stance === "AL"
      ? `${leadIdea.symbol} giriş bandına gelirse fırsat oluşabilir. Bandın üstünde alma.`
      : "Net yön yok. Nakit tut. Yeni sinyali bekle.";
  const simpleGuidance = [
    { label: "TAKİP ET", text: `${compactText(macroReport?.marketRegime ?? "Piyasa yönü net değil", 90)}. Dolar, altın, petrol ve ana endeksleri izle.` },
    { label: "DİKKAT ET", text: mainAlert ? simpleAlertInstruction(mainAlert) : "Bugün güçlü bir alarm yok. Sabırlı kal." },
    { label: "YAPMA", text: "Hızlı yükselen fiyatın peşinden gitme. Stop olmadan işlem yapma." },
    { label: "OLASI YÖN", text: directionSentence },
  ];
  const alertSubject = universePulse.totalAlertCount > 0 ? `${universePulse.totalAlertCount} özel durum` : "seçici görünüm";
  const subject = `Enbilir VIP · Günlük Piyasa Brifingi · ${alertSubject}`;

  const textLines = [
    `Merhaba ${input.recipientName},`,
    "",
    `ENBİLİR VIP · ${report.periodKey} · GÜNLÜK PİYASA BRİFİNGİ`,
    readableExcerpt(report.executiveSummary, 2, 145),
    report.fallbackUsed ? "VERİ NOTU: Kaynak araştırması sınırlı. Temkinli kal." : "",
    "",
    "BUGÜN İÇİN NET PLAN",
    ...simpleGuidance.map((item) => `${item.label}: ${item.text}`),
    "",
    "VIP AJANLARININ BUGÜNKÜ KARARI",
    "K/Z, 1.000.000 USD performans tabanına göre başlangıçtan beri hesaplanır.",
    ...agents.flatMap((agent) => {
      const reason = readableExcerpt(agent.summary, 2, 125);
      const normalizedSummary = agent.summary.trim().toLocaleLowerCase("tr-TR");
      const normalizedAdvice = agent.dailyAdvice.trim().toLocaleLowerCase("tr-TR");
      const showReason = Boolean(normalizedSummary) && normalizedSummary !== normalizedAdvice;
      return [
        `${agent.name} · ${agent.riskProfile}`,
        `GÜNÜN KARARI: ${agent.dailyActionLabel}`,
        agent.dailyAdvice,
        showReason ? `Kararın nedeni: ${reason}` : "",
        `Başlangıçtan beri: ${formatSignedPercent(agent.returnPercent)} / ${formatUsd(agent.pnlUsd)}`,
        ...agent.decisions.map((decision) => `${decision.actionLabel} ${decision.symbol}: ${readableExcerpt(decision.reason, 2, 110)} ${simpleDecisionAdvice(decision)} Stop ${formatPriceLevel(decision.stopLoss, decision.currency)}. Hedef ${formatPriceLevel(decision.targetPrice, decision.currency)}.`),
      ];
    }),
    "",
    "SON 3 GÜN PİYASA PANOSU",
    ...charts.map((chart) => `${chart.label}: ${formatChartPrice(chart.lastPrice)} · ${formatSignedPercent(chart.changePercent3d)} · ${chartDirection(chart)}`),
    "",
    "BUGÜN PİYASADA NE ÖNEMLİ?",
    `Makro görünüm: ${macroCommentary}`,
    ...ideas.map((idea) => `Mikro görünüm · ${idea.symbol}: ${readableExcerpt(idea.thesisSummary, 2, 125)}`),
    ...keyTakeaways.map((item) => `Önemli nokta: ${readableExcerpt(item, 2, 125)}`),
    "",
    `${universePulse.universeSize} VARLIKTA ERKEN UYARI`,
    `${universePulse.verifiedQuoteCount} fiyat doğrulandı. ${universePulse.totalAlertCount} özel durum bulundu.`,
    ...universePulse.alerts.map((alert) => `${alert.symbol} · ${alert.label} · ${formatSignedPercent(alert.changePercent)}. Ne oldu: ${readableExcerpt(alert.commentary, 2, 110)} Ne yapmalı: ${simpleAlertInstruction(alert)}`),
    "",
    "EN GÜÇLÜ ASİMETRİK FIRSATLAR",
    ...ideas.map((idea) => `#${idea.rank} ${idea.symbol} · ${idea.stance}. Neden: ${readableExcerpt(idea.thesisSummary, 2, 125)} Plan: ${simpleIdeaInstruction(idea)} Hedef ${formatPriceLevel(idea.targetPrice, idea.currency)}. Güven ${idea.confidenceScore}/100. Risk ${idea.riskScore}/100.`),
    "",
    "BUGÜNÜN ÖNEMLİ HABERLERİ",
    ...[...news.macro, ...news.micro].map((item) => `${item.source}: ${compactText(item.title, 150)} ${newsImpact(item)} ${item.link}`),
    "",
    `Tam VIP raporu: ${urls.report}`,
    `VIP ajan masası: ${urls.agents}`,
    macroReport && urls.macroReport ? `Makro rapor: ${urls.macroReport}` : "",
    "",
    "SABİT, OLGUN ve YILDIRIM sanal portföy ajanlarıdır. Gerçek emir göndermez.",
    report.disclaimer,
    "Dr. Hakan Ünsal tarafından eğitilmiş yapay zeka tarafından üretilmiştir. Son karar kullanıcıya aittir.",
  ];

  const html = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="x-apple-disable-message-reformatting"><meta name="color-scheme" content="light only"><title>${escapeHtml(subject)}</title><style>
    body{margin:0!important;padding:0!important;background:#edf1f2!important}body,table,td,p,a{font-family:Arial,sans-serif}.email-shell{width:680px;max-width:680px}.px{padding-left:28px!important;padding-right:28px!important}.stack-spacer{font-size:1px;line-height:1px}.chart-image{width:100%!important;height:auto!important}
    @media only screen and (max-width:620px){.email-shell{width:100%!important;max-width:100%!important}.px{padding-left:16px!important;padding-right:16px!important}.stack{display:block!important;width:100%!important;box-sizing:border-box!important}.stack-spacer{display:block!important;width:100%!important;height:10px!important;font-size:10px!important;line-height:10px!important}.hide-mobile{display:none!important}.hero-title{font-size:27px!important;line-height:1.15!important}.stat-cell{display:block!important;width:100%!important;border-right:0!important;border-bottom:1px solid #39505c!important}.stat-cell:last-child{border-bottom:0!important}.mobile-center{text-align:center!important}.chart-image{max-width:100%!important}}
  </style><!--[if mso]><style>table{border-collapse:collapse!important}.email-shell{width:680px!important}</style><![endif]--></head><body>
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">Bugünün açık piyasa özeti, üç VIP ajanının kararı ve 11 varlığın üç günlük grafiği.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#edf1f2"><tr><td align="center" style="padding:22px 8px">
      <table role="presentation" class="email-shell" width="680" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:680px;max-width:680px;border:1px solid #d8e0e3;border-top:5px solid #b8892f;border-collapse:separate;border-radius:18px;overflow:hidden">
        <tr><td class="px" bgcolor="#101c27" style="padding-top:25px;padding-bottom:25px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td width="48" valign="middle"><table role="presentation" width="42" height="42" bgcolor="#d3a23f" style="border-radius:12px"><tr><td align="center" valign="middle" style="font-family:Georgia,serif;font-size:22px;font-weight:900;color:#101c27">E</td></tr></table></td><td valign="middle"><p style="margin:0;font-family:Arial,sans-serif;font-size:14px;font-weight:900;letter-spacing:.12em;color:#ffffff">ENBİLİR VIP</p><p style="margin:3px 0 0;font-family:Arial,sans-serif;font-size:9px;font-weight:800;letter-spacing:.16em;color:#d3a23f">INTELLIGENCE BRIEF</p></td><td class="hide-mobile" align="right" valign="middle"><p style="margin:0;font-family:Arial,sans-serif;font-size:10px;font-weight:800;color:#b8c7cf">${escapeHtml(formatPeriod(report.periodKey))}</p><p style="margin:4px 0 0;font-family:Arial,sans-serif;font-size:10px;font-weight:900;color:#d3a23f">07:00 GÜNLÜK BÜLTEN</p></td></tr></table>
          <p style="margin:28px 0 7px;font-family:Arial,sans-serif;font-size:10px;font-weight:900;letter-spacing:.14em;color:#8fdbc9">GÜRÜLTÜSÜZ PİYASA OKUMASI</p>
          <h1 class="hero-title" style="margin:0;font-family:Georgia,serif;font-size:34px;line-height:1.16;color:#ffffff">Bugünün Piyasa Brifingi</h1>
          <p style="margin:13px 0 0;font-family:Arial,sans-serif;font-size:15px;line-height:1.65;color:#d6e0e5">Merhaba ${escapeHtml(input.recipientName)}. ${escapeHtml(readableExcerpt(report.executiveSummary, 2, 145))}</p>
          ${report.fallbackUsed ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#382d24" style="margin-top:12px;border:1px solid #715d43;border-radius:8px"><tr><td style="padding:8px 10px;font-size:10px;font-weight:800;color:#f4d89a">VERİ NOTU · Kaynak araştırması sınırlı. Temkinli kal.</td></tr></table>` : ""}
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#1a2b36" style="margin-top:20px;border:1px solid #39505c;border-collapse:separate;border-radius:11px"><tr><td class="stat-cell" width="33%" align="center" style="padding:12px 8px;border-right:1px solid #39505c"><p style="margin:0;font-size:20px;font-weight:900;color:#ffffff">${universePulse.universeSize}</p><p style="margin:3px 0 0;font-size:9px;font-weight:800;letter-spacing:.08em;color:#9fb0b9">VARLIK TARANDI</p></td><td class="stat-cell" width="34%" align="center" style="padding:12px 8px;border-right:1px solid #39505c"><p style="margin:0;font-size:20px;font-weight:900;color:#d3a23f">${universePulse.totalAlertCount}</p><p style="margin:3px 0 0;font-size:9px;font-weight:800;letter-spacing:.08em;color:#9fb0b9">ÖZEL DURUM</p></td><td class="stat-cell" width="33%" align="center" style="padding:12px 8px"><p style="margin:0;font-size:20px;font-weight:900;color:#8fdbc9">${agents.length}</p><p style="margin:3px 0 0;font-size:9px;font-weight:800;letter-spacing:.08em;color:#9fb0b9">VIP AJANI</p></td></tr></table>
        </td></tr>

        <tr><td class="px" bgcolor="#ffffff" style="padding-top:26px;padding-bottom:28px;border-bottom:1px solid #e1e6e8">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.13em;color:#0f766e">BUGÜN İÇİN NET PLAN</p><h2 style="margin:6px 0 15px;font-family:Georgia,serif;font-size:24px;color:#172033">Dört kısa cümle, tek bakış</h2>${renderGuidanceCards(simpleGuidance)}
        </td></tr>

        <tr><td class="px" bgcolor="#f3f0ea" style="padding-top:27px;padding-bottom:29px;border-bottom:1px solid #ded6c9">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.13em;color:#8a6418">ÖZEL BÖLÜM · BUGÜNÜN KARARLARI</p><h2 style="margin:6px 0 6px;font-family:Georgia,serif;font-size:24px;color:#172033">SABİT, OLGUN ve YILDIRIM</h2><p style="margin:0;font-size:12px;line-height:1.6;color:#5f6b78">Karar, gerekçe ve işlem planı aşağıda açıkça yazıyor. K/Z, 1.000.000 USD üzerinden hesaplanır.</p>${renderAgentCards(agents)}<div style="height:16px;line-height:16px;font-size:1px">&nbsp;</div>${renderButton("VIP ajan masasını aç", urls.agents, true)}
        </td></tr>

        <tr><td class="px" bgcolor="#f7f9fa" style="padding-top:27px;padding-bottom:29px;border-bottom:1px solid #e1e6e8">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.13em;color:#0f766e">SON 3 GÜN PİYASA PANOSU</p><h2 style="margin:6px 0 6px;font-family:Georgia,serif;font-size:24px;color:#172033">${escapeHtml(chartHeading)}</h2><p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#5f6b78">Fiyat, üç günlük değişim ve yön aynı kartta. Ana bilgi, grafiğin altında metin olarak da yer alıyor.</p>${renderChartBoard(charts)}
        </td></tr>

        <tr><td class="px" bgcolor="#ffffff" style="padding-top:27px;padding-bottom:29px;border-bottom:1px solid #e1e6e8">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.13em;color:#0f766e">BUGÜN PİYASADA NE ÖNEMLİ?</p><h2 style="margin:6px 0 15px;font-family:Georgia,serif;font-size:24px;color:#172033">Makro ve mikro görünüm</h2>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td class="stack" width="50%" valign="top"><table role="presentation" width="100%" bgcolor="#edf8f6" style="border-left:4px solid #0f766e;border-radius:10px"><tr><td style="padding:14px"><p style="margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:.1em;color:#0f766e">MAKRO GÖRÜNÜM</p><p style="margin:0;font-size:13px;line-height:1.62;color:#334155">${escapeHtml(macroCommentary)}</p></td></tr></table></td><td class="stack-spacer" width="12">&nbsp;</td><td class="stack" width="50%" valign="top"><table role="presentation" width="100%" bgcolor="#fff8e8" style="border-left:4px solid #b8892f;border-radius:10px"><tr><td style="padding:14px"><p style="margin:0 0 6px;font-size:10px;font-weight:900;letter-spacing:.1em;color:#8a6418">MİKRO GÖRÜNÜM</p>${ideas.map((idea) => `<p style="margin:0 0 8px;font-size:13px;line-height:1.55;color:#334155"><strong>${escapeHtml(idea.symbol)}:</strong> ${escapeHtml(readableExcerpt(idea.thesisSummary, 1, 130))}</p>`).join("") || `<p style="margin:0;font-size:13px;line-height:1.55;color:#334155">Bugün yeni mikro tez yok.</p>`}</td></tr></table></td></tr></table>
          ${keyTakeaways.length > 0 ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f7f9fa" style="margin-top:14px;border:1px solid #e1e6e8;border-radius:10px"><tr><td style="padding:14px"><p style="margin:0 0 8px;font-size:10px;font-weight:900;letter-spacing:.1em;color:#172033">BUGÜNÜN ÜÇ ÖNEMLİ NOKTASI</p>${keyTakeaways.map((item, index) => `<p style="margin:${index > 0 ? "8px" : "0"} 0 0;font-size:13px;line-height:1.55;color:#485563"><strong style="color:#b8892f">${index + 1}.</strong> ${escapeHtml(readableExcerpt(item, 2, 115))}</p>`).join("")}</td></tr></table>` : ""}
          ${macroReport && urls.macroReport ? `<div style="height:16px;line-height:16px;font-size:1px">&nbsp;</div>${renderButton("Makro raporun tamamını aç", urls.macroReport, true)}` : ""}
        </td></tr>

        <tr><td class="px" bgcolor="#f7f9fa" style="padding-top:27px;padding-bottom:29px;border-bottom:1px solid #e1e6e8">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.13em;color:#0f766e">ERKEN UYARI RADARI</p><h2 style="margin:6px 0 6px;font-family:Georgia,serif;font-size:24px;color:#172033">${universePulse.universeSize} varlıkta öne çıkanlar</h2><p style="margin:0;font-size:12px;line-height:1.6;color:#5f6b78">${universePulse.verifiedQuoteCount} fiyat doğrulandı. ${universePulse.totalAlertCount} özel durum bulundu. Ne olduğu ve ne yapılması gerektiği açıkça yazıyor.</p>${renderAlertCards(universePulse.alerts)}
        </td></tr>

        <tr><td class="px" bgcolor="#ffffff" style="padding-top:27px;padding-bottom:29px;border-bottom:1px solid #e1e6e8">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.13em;color:#8a6418">ASİMETRİK FIRSATLAR</p><h2 style="margin:6px 0 6px;font-family:Georgia,serif;font-size:24px;color:#172033">En güçlü fikirler</h2><p style="margin:0;font-size:12px;line-height:1.6;color:#5f6b78">Tez, giriş, stop, hedef, güven ve risk bilgileri mailin içinde açık. Bağlantı yalnız daha derin kanıtlar içindir.</p>${renderIdeaCards(ideas)}<div style="height:16px;line-height:16px;font-size:1px">&nbsp;</div>${renderButton("Tam VIP raporunu ve performansı aç", urls.report)}
        </td></tr>

        <tr><td class="px" bgcolor="#f7f9fa" style="padding-top:27px;padding-bottom:29px;border-bottom:1px solid #e1e6e8">
          <p style="margin:0;font-size:10px;font-weight:900;letter-spacing:.13em;color:#0f766e">BUGÜNÜN ÖNEMLİ HABERLERİ</p><h2 style="margin:6px 0 6px;font-family:Georgia,serif;font-size:24px;color:#172033">Yalnız fiyatlamayı etkileyebilecek başlıklar</h2><p style="margin:0;font-size:12px;line-height:1.6;color:#5f6b78">Başlık ve olası etkisi açıkça yazıyor. Kaynak bağlantısı doğrulama içindir.</p>${renderNewsList("Makro gelişmeler", news.macro)}${renderNewsList("Şirket ve sektör gelişmeleri", news.micro)}${news.macro.length + news.micro.length === 0 ? `<p style="margin:14px 0 0;font-size:13px;color:#5f6b78">Bugün e-posta eşiğini geçen yeni haber yok.</p>` : ""}
        </td></tr>

        <tr><td class="px" bgcolor="#101c27" style="padding-top:23px;padding-bottom:24px"><p style="margin:0;font-size:11px;line-height:1.6;color:#b8c7cf">SABİT, OLGUN ve YILDIRIM sanal portföy ajanlarıdır; gerçek emir göndermez. ${escapeHtml(report.disclaimer)}</p><p style="margin:11px 0 0;font-size:11px;line-height:1.6;color:#b8c7cf">Bu içerik, Dr. Hakan Ünsal tarafından eğitilmiş yapay zeka tarafından üretilmiştir. Yapay zeka hata yapabilir. Son karar ve sorumluluk kullanıcıya aittir.</p><p style="margin:15px 0 0"><a href="${escapeHtml(urls.home)}" style="font-size:12px;font-weight:900;color:#d3a23f;text-decoration:none">enbilir.com →</a></p></td></tr>
      </table>
    </td></tr></table>
  </body></html>`;

  return {
    subject,
    text: textLines.join("\n").replace(/\n{3,}/g, "\n\n").trim(),
    html,
  };
}
