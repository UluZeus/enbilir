"use client";

import { useId, useState } from "react";

type LeagueInviteActionsProps = {
  inviteUrl: string;
  leagueName: string;
  locale: "tr" | "en";
};

export function LeagueInviteActions({ inviteUrl, leagueName, locale }: LeagueInviteActionsProps) {
  const [copyState, setCopyState] = useState<"idle" | "success" | "error">("idle");
  const copyStatusId = useId();
  const isEnglish = locale === "en";
  const shareText = isEnglish
    ? `Join the ${leagueName} league on Enbilir: ${inviteUrl}`
    : `Enbilir'de ${leagueName} ligine doğrudan katılabilirsin. Bağlantı: ${inviteUrl}`;
  const mailSubject = encodeURIComponent(isEnglish ? `Enbilir league link: ${leagueName}` : `Enbilir lig bağlantısı: ${leagueName}`);
  const mailBody = encodeURIComponent(shareText);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopyState("success");
      window.setTimeout(() => setCopyState("idle"), 2200);
    } catch {
      setCopyState("error");
    }
  }

  return (
    <div>
      <div className="league-invite-actions grid gap-2 sm:grid-cols-3">
        <button
          type="button"
          onClick={copyInvite}
          aria-describedby={copyStatusId}
          className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:border-[#d1bfa7] hover:bg-white/16"
        >
          {copyState === "success" ? (isEnglish ? "Copied" : "Kopyalandı") : (isEnglish ? "Copy" : "Kopyala")}
        </button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="rounded-lg border border-[#25d366]/45 bg-[#075e54] px-3 py-2 text-center text-xs font-black text-white transition hover:bg-[#128c7e]"
        >
          {isEnglish ? "Share WhatsApp" : "WhatsApp ile paylaş"}
        </a>
        <a
          href={`mailto:?subject=${mailSubject}&body=${mailBody}`}
          className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center text-xs font-black text-white transition hover:border-[#d1bfa7] hover:bg-white/16"
        >
          {isEnglish ? "Send email" : "E-posta ile gönder"}
        </a>
      </div>
      <p
        id={copyStatusId}
        role="status"
        aria-live="polite"
        className={`mt-2 min-h-5 text-xs font-semibold ${copyState === "error" ? "text-rose-200" : "text-emerald-200"}`}
      >
        {copyState === "success"
          ? isEnglish ? "League link copied." : "Lig bağlantısı kopyalandı."
          : copyState === "error"
            ? isEnglish ? "The link could not be copied. Select it manually." : "Bağlantı kopyalanamadı. Elle seçip kopyalayabilirsin."
            : ""}
      </p>
    </div>
  );
}
