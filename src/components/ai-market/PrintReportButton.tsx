"use client";

import { macroReportEventTypes } from "@/lib/ai-market/report-event-types";

export function PrintReportButton({ reportId }: { reportId: string }) {
  async function handlePrint() {
    try {
      await fetch("/api/ai-market/reports/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportId,
          eventType: macroReportEventTypes.pdfDownload,
          metadata: { source: "print-button" },
        }),
      });
    } catch {
      // Printing should not be blocked if analytics logging is unavailable.
    }

    window.print();
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="rounded-md border border-[#0f766e] bg-[#0f766e] px-3 py-2 text-sm font-black text-white"
    >
      PDF için yazdır
    </button>
  );
}
