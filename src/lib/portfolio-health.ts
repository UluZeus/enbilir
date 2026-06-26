import { initialCashUsd } from "@/lib/portfolio";

type PortfolioPositionLike = {
  symbol: string;
  valueUsd: number;
  profitLossUsd: number;
};

type PortfolioSnapshotLike = {
  cashValueUsd: number;
  totalValueUsd: number;
  profitLossUsd: number;
  positions: PortfolioPositionLike[];
};

type PortfolioHealthInput = {
  snapshot: PortfolioSnapshotLike | null;
  tradeCount: number;
  tradeNoteCount: number;
};

export type PortfolioHealthResult = {
  score: number;
  grade: "A" | "B" | "C" | "D";
  cashRatio: number;
  concentrationRatio: number;
  diversificationScore: number;
  noteRatio: number;
  riskLabelTr: string;
  riskLabelEn: string;
  highlightsTr: string[];
  highlightsEn: string[];
};

function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, value));
}

function ratio(value: number, total: number) {
  return total > 0 && Number.isFinite(value) ? value / total : 0;
}

function getGrade(score: number): PortfolioHealthResult["grade"] {
  if (score >= 82) return "A";
  if (score >= 66) return "B";
  if (score >= 48) return "C";
  return "D";
}

export function calculatePortfolioHealth({ snapshot, tradeCount, tradeNoteCount }: PortfolioHealthInput): PortfolioHealthResult {
  if (!snapshot || snapshot.totalValueUsd <= 0) {
    return {
      score: 42,
      grade: "D",
      cashRatio: 1,
      concentrationRatio: 0,
      diversificationScore: 0,
      noteRatio: 0,
      riskLabelTr: "Başlangıç",
      riskLabelEn: "Starting",
      highlightsTr: [
        "Henüz ölçülebilir portföy davranışı oluşmadı.",
        "İlk sanal işlemden önce kısa bir karar gerekçesi yazmak skoru güçlendirir.",
      ],
      highlightsEn: [
        "There is not enough measurable portfolio behavior yet.",
        "Writing a short decision note before the first virtual trade improves the score.",
      ],
    };
  }

  const positionValues = snapshot.positions.map((position) => Math.max(0, position.valueUsd));
  const cashRatio = ratio(snapshot.cashValueUsd, snapshot.totalValueUsd);
  const largestPosition = positionValues.length > 0 ? Math.max(...positionValues) : 0;
  const concentrationRatio = ratio(largestPosition, snapshot.totalValueUsd);
  const diversificationScore = clamp((Math.min(snapshot.positions.length, 8) / 8) * 100);
  const cashScore = clamp(100 - Math.abs(cashRatio - 0.18) * 210);
  const concentrationScore = clamp(100 - Math.max(0, concentrationRatio - 0.28) * 190);
  const noteRatio = tradeCount > 0 ? tradeNoteCount / tradeCount : 0;
  const noteScore = clamp(noteRatio * 100);
  const drawdownPenalty = snapshot.profitLossUsd < 0 ? clamp((Math.abs(snapshot.profitLossUsd) / initialCashUsd) * 90, 0, 22) : 0;
  const score = Math.round(
    clamp(
      diversificationScore * 0.24 +
        cashScore * 0.2 +
        concentrationScore * 0.28 +
        noteScore * 0.18 +
        10 -
        drawdownPenalty,
    ),
  );
  const grade = getGrade(score);
  const riskLabelTr = score >= 82 ? "Sağlıklı" : score >= 66 ? "Dengeli" : score >= 48 ? "Dikkat gerekli" : "Kırılgan";
  const riskLabelEn = score >= 82 ? "Healthy" : score >= 66 ? "Balanced" : score >= 48 ? "Needs attention" : "Fragile";
  const highlightsTr = [
    snapshot.positions.length >= 5 ? "Çeşitlendirme güçlü görünüyor." : "Çeşitlendirme artırılabilir; tek varlık etkisini azaltmayı düşün.",
    concentrationRatio > 0.42 ? "Tek varlık yoğunlaşması yüksek; portföy davranışı kırılganlaşabilir." : "Tek varlık yoğunlaşması kontrol edilebilir seviyede.",
    cashRatio < 0.04 ? "Nakit payı çok düşük; yeni fırsat veya risk dönemleri için alan daralabilir." : "Nakit payı karar esnekliği sağlıyor.",
    noteRatio >= 0.5 ? "İşlem notu alışkanlığı karar kalitesini görünür kılıyor." : "İşlem gerekçesi yazma oranı artırılırsa öğrenme kalitesi yükselir.",
  ];
  const highlightsEn = [
    snapshot.positions.length >= 5 ? "Diversification looks strong." : "Diversification can improve; consider reducing single-asset impact.",
    concentrationRatio > 0.42 ? "Single-asset concentration is high; portfolio behavior may become fragile." : "Single-asset concentration is manageable.",
    cashRatio < 0.04 ? "Cash share is very low; flexibility may shrink in opportunity or risk periods." : "Cash share supports decision flexibility.",
    noteRatio >= 0.5 ? "Trade notes make decision quality visible." : "Writing more trade reasons would improve learning quality.",
  ];

  return {
    score,
    grade,
    cashRatio,
    concentrationRatio,
    diversificationScore,
    noteRatio,
    riskLabelTr,
    riskLabelEn,
    highlightsTr,
    highlightsEn,
  };
}
