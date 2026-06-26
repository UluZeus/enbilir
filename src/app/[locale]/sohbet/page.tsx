import type { Metadata } from "next";
import { AiMarketChatPanel } from "@/components/ai-market/AiMarketChatPanel";
import { ChatRoomClient } from "@/components/ChatRoomClient";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { generalChatRoomCode, getChatRoomState, normalizeRoomCode } from "@/lib/chat";
import { getMembershipSnapshot, membershipConfig } from "@/lib/membership";
import { prisma } from "@/lib/prisma";
import { buildPageMetadata } from "@/lib/seo";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = getSafeLocale(rawLocale);
  return buildPageMetadata({ locale, path: "/sohbet", page: "chat" });
}

export default async function ChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ oda?: string }>;
}) {
  const { locale: rawLocale } = await params;
  const query = searchParams ? await searchParams : {};
  const locale = getSafeLocale(rawLocale);
  const sessionUser = await getSessionUser();
  const initialRoomCode = normalizeRoomCode(query.oda) || generalChatRoomCode;
  const [initialState, membershipUser] = await Promise.all([
    sessionUser ? getChatRoomState({ user: sessionUser, roomCode: initialRoomCode }) : Promise.resolve(null),
    sessionUser
      ? prisma.user.findUnique({
          where: { id: sessionUser.id },
          select: { createdAt: true, membershipTier: true, vipPaidUntil: true },
        })
      : Promise.resolve(null),
  ]);
  const membership = membershipUser ? getMembershipSnapshot(membershipUser) : null;

  return (
    <div className="grid gap-5">
      <AiMarketChatPanel
        locale={locale}
        membershipTier={membership?.effectiveTier ?? "STANDARD"}
        vipPaidUntil={membership?.vipPaidUntil?.toISOString() ?? null}
        standardPaymentLink={membershipConfig.standardPaymentLink}
        vipPaymentLink={membershipConfig.vipPaymentLink}
      />
      <ChatRoomClient
        locale={locale}
        authenticated={Boolean(sessionUser)}
        loginHref={`/${locale}/giris?returnTo=${encodeURIComponent(`/${locale}/sohbet`)}`}
        initialRoomCode={initialRoomCode}
        initialState={initialState}
      />
    </div>
  );
}
