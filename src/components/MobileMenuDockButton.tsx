"use client";

export function MobileMenuDockButton({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event("enbilir:open-mobile-menu"))}
      className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center text-xs font-black text-[#152033]"
    >
      {label}
    </button>
  );
}
