"use client";

import { useState } from "react";

type LeagueInviteActionsProps = {
  inviteCode: string;
  inviteUrl: string;
  leagueName: string;
  locale: "tr" | "en";
};

export function LeagueInviteActions({ inviteCode, inviteUrl, leagueName, locale }: LeagueInviteActionsProps) {
  const [copied, setCopied] = useState(false);
  const isEnglish = locale === "en";
  const shareText = isEnglish
    ? `Join ${leagueName} on Enbilir with invite code ${inviteCode}: ${inviteUrl}`
    : `Enbilir'de ${leagueName} ligine davet kodu ile katılabilirsin: ${inviteCode}. Bağlantı: ${inviteUrl}`;
  const mailSubject = encodeURIComponent(isEnglish ? `Enbilir league invite: ${leagueName}` : `Enbilir lig daveti: ${leagueName}`);
  const mailBody = encodeURIComponent(shareText);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${inviteCode} - ${inviteUrl}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="league-invite-actions grid gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={copyInvite}
        className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:border-[#d1bfa7] hover:bg-white/16"
      >
        {copied ? (isEnglish ? "Copied" : "Kopyalandı") : (isEnglish ? "Copy" : "Kopyala")}
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
  );
}
