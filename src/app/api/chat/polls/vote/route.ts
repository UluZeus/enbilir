import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getChatRoomState, markChatPresence } from "@/lib/chat";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: { messageId?: unknown; optionId?: unknown };

  try {
    body = await request.json() as { messageId?: unknown; optionId?: unknown };
  } catch {
    return NextResponse.json({ authenticated: true, error: "Geçersiz istek." }, { status: 400 });
  }

  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  const optionId = typeof body.optionId === "string" ? body.optionId : "";

  if (!messageId || !optionId) {
    return NextResponse.json({ authenticated: true, error: "Anket ve seçenek bilgisi gerekli." }, { status: 400 });
  }

  const option = await prisma.chatPollOption.findFirst({
    where: {
      id: optionId,
      messageId,
      message: { type: "POLL" },
    },
    include: {
      message: {
        select: { id: true, roomId: true, room: { select: { code: true } } },
      },
    },
  });

  if (!option) {
    return NextResponse.json({ authenticated: true, error: "Anket seçeneği bulunamadı." }, { status: 404 });
  }

  await prisma.chatPollVote.upsert({
    where: {
      messageId_userId: {
        messageId,
        userId: user.id,
      },
    },
    update: {
      optionId,
    },
    create: {
      messageId,
      optionId,
      userId: user.id,
    },
  });
  await markChatPresence({ roomId: option.message.roomId, userId: user.id });

  const state = await getChatRoomState({ user, roomCode: option.message.room.code });

  return NextResponse.json({ authenticated: true, ...state });
}
