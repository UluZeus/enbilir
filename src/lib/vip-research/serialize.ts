import type { DecimalValue } from "@/lib/decimal";
import { decimalToNumber, nullableDecimalToNumber } from "@/lib/decimal";

type StoredEvaluation = {
  priceAtEvaluation: DecimalValue | null;
  returnPercent: DecimalValue | null;
};

type StoredIdea = {
  priceAtRecommendation: DecimalValue;
  entryLow: DecimalValue;
  entryHigh: DecimalValue;
  stopLoss: DecimalValue;
  targetPrice: DecimalValue;
  secondaryTargetPrice: DecimalValue | null;
  evaluations: StoredEvaluation[];
};

type SerializedEvaluation<T extends StoredEvaluation> = Omit<T, "priceAtEvaluation" | "returnPercent"> & {
  priceAtEvaluation: number | null;
  returnPercent: number | null;
};

type SerializedIdea<T extends StoredIdea> = Omit<T,
  | "priceAtRecommendation"
  | "entryLow"
  | "entryHigh"
  | "stopLoss"
  | "targetPrice"
  | "secondaryTargetPrice"
  | "evaluations"
> & {
  priceAtRecommendation: number;
  entryLow: number;
  entryHigh: number;
  stopLoss: number;
  targetPrice: number;
  secondaryTargetPrice: number | null;
  evaluations: Array<SerializedEvaluation<T["evaluations"][number]>>;
};

export function serializeVipResearchReport<T extends { ideas: StoredIdea[] }>(
  report: T,
): Omit<T, "ideas"> & { ideas: Array<SerializedIdea<T["ideas"][number]>> } {
  return {
    ...report,
    ideas: report.ideas.map((idea) => ({
      ...idea,
      priceAtRecommendation: decimalToNumber(idea.priceAtRecommendation),
      entryLow: decimalToNumber(idea.entryLow),
      entryHigh: decimalToNumber(idea.entryHigh),
      stopLoss: decimalToNumber(idea.stopLoss),
      targetPrice: decimalToNumber(idea.targetPrice),
      secondaryTargetPrice: nullableDecimalToNumber(idea.secondaryTargetPrice),
      evaluations: idea.evaluations.map((evaluation) => ({
        ...evaluation,
        priceAtEvaluation: nullableDecimalToNumber(evaluation.priceAtEvaluation),
        returnPercent: nullableDecimalToNumber(evaluation.returnPercent),
      })),
    })),
  } as unknown as Omit<T, "ideas"> & { ideas: Array<SerializedIdea<T["ideas"][number]>> };
}
