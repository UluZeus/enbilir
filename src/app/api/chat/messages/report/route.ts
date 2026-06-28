import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getChatRoomState } from "@/lib/chat";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeReason(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 240) : "";
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: { messageId?: unknown; reason?: unknown };

  try {
    body = await request.json() as { messageId?: unknown; reason?: unknown };
  } catch {
    return NextResponse.json({ authenticated: true, error: "Geçersiz istek." }, { status: 400 });
  }

  const messageId = typeof body.messageId === "string" ? body.messageId : "";
  const reason = normalizeReason(body.reason) || "Topluluk kurallarına aykırı olabilir.";

  if (!messageId) {
    return NextResponse.json({ authenticated: true, error: "Mesaj bulunamadı." }, { status: 400 });
  }

  const message = await prisma.chatMessage.findUnique({
    where: { id: messageId },
    select: { id: true, room: { select: { code: true } }, userId: true },
  });

  if (!message) {
    return NextResponse.json({ authenticated: true, error: "Mesaj bulunamadı." }, { status: 404 });
  }

  if (message.userId === user.id) {
    return NextResponse.json({ authenticated: true, error: "Kendi mesajını şikayet edemezsin." }, { status: 400 });
  }

  await prisma.chatMessageReport.upsert({
    where: {
      messageId_reporterId: {
        messageId,
        reporterId: user.id,
      },
    },
    create: {
      messageId,
      reporterId: user.id,
      reason,
    },
    update: {
      reason,
      status: "OPEN",
    },
  });

  const reportCount = await prisma.chatMessageReport.count({
    where: { messageId, status: "OPEN" },
  });
  await prisma.chatMessage.update({
    where: { id: messageId },
    data: {
      reportCount,
      hiddenAt: reportCount >= 3 ? new Date() : undefined,
      hiddenReason: reportCount >= 3 ? "Topluluk şikayet eşiği nedeniyle otomatik gizlendi." : undefined,
    },
  });

  const state = await getChatRoomState({ user, roomCode: message.room.code });

  return NextResponse.json({ authenticated: true, ...state });
}
