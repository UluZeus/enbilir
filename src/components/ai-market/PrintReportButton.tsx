"use client";

export function PrintReportButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-md border border-[#0f766e] bg-[#0f766e] px-3 py-2 text-sm font-black text-white"
    >
      PDF için yazdır
    </button>
  );
}
