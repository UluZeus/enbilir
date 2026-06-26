import type { Metadata } from "next";
import { ChatRoomClient } from "@/components/ChatRoomClient";
import { getSafeLocale } from "@/i18n/config";
import { getSessionUser } from "@/lib/auth";
import { generalChatRoomCode, getChatRoomState, normalizeRoomCode } from "@/lib/chat";
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
  const initialState = sessionUser ? await getChatRoomState({ user: sessionUser, roomCode: initialRoomCode }) : null;

  return (
    <ChatRoomClient
      locale={locale}
      authenticated={Boolean(sessionUser)}
      loginHref={`/${locale}/giris?returnTo=${encodeURIComponent(`/${locale}/sohbet`)}`}
      initialRoomCode={initialRoomCode}
      initialState={initialState}
    />
  );
}
