import { describe, expect, it } from "vitest";
import { getScrollableTableA11yCopy } from "@/components/ai-market/AnalysisTable";

describe("getScrollableTableA11yCopy", () => {
  it("keeps the horizontal-scroll instruction localized", () => {
    expect(getScrollableTableA11yCopy("tr")).toEqual({
      label: "Favori analiz tablosu. Tüm sütunları görmek için yatay kaydırın.",
      hint: "Tüm sütunları görmek için yatay kaydırın",
    });
    expect(getScrollableTableA11yCopy("en")).toEqual({
      label: "Favorite analysis table. Scroll horizontally to view all columns.",
      hint: "Scroll horizontally to view all columns",
    });
  });
});
