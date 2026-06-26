import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  getChatRoomState,
  markChatPresence,
  normalizeChatAttachment,
  normalizeChatMessage,
  normalizeChatMessageType,
  normalizeRoomCode,
  resolveChatRoom,
} from "@/lib/chat";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

export const dynamic = "force-dynamic";

function hasAttachmentUrl(attachment: Record<string, unknown> | null) {
  return typeof attachment?.url === "string" && attachment.url.startsWith("/uploads/chat/");
}

function hasLocation(attachment: Record<string, unknown> | null) {
  return typeof attachment?.latitude === "number" && typeof attachment.longitude === "number";
}

function hasContact(attachment: Record<string, unknown> | null) {
  return typeof attachment?.name === "string" && attachment.name.trim().length > 0;
}

function normalizePollOptions(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(new Set(
    value
      .map((entry) => typeof entry === "string" ? entry.replace(/\s+/g, " ").trim().slice(0, 120) : "")
      .filter(Boolean),
  )).slice(0, 8);
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: { roomCode?: unknown; message?: unknown; type?: unknown; attachment?: unknown; pollOptions?: unknown };

  try {
    body = await request.json() as { roomCode?: unknown; message?: unknown; type?: unknown; attachment?: unknown; pollOptions?: unknown };
  } catch {
    return NextResponse.json({ authenticated: true, error: "Geçersiz istek." }, { status: 400 });
  }

  const message = normalizeChatMessage(body.message);
  const type = normalizeChatMessageType(body.type);
  const attachment = normalizeChatAttachment(body.attachment);
  const pollOptions = normalizePollOptions(body.pollOptions);

  if (type === "TEXT" && !message) {
    return NextResponse.json({ authenticated: true, error: "Boş mesaj gönderilemez." }, { status: 400 });
  }

  if ((type === "FILE" || type === "IMAGE" || type === "VIDEO") && !hasAttachmentUrl(attachment)) {
    return NextResponse.json({ authenticated: true, error: "Dosya yüklenmeden mesaj gönderilemez." }, { status: 400 });
  }

  if (type === "LOCATION" && !hasLocation(attachment)) {
    return NextResponse.json({ authenticated: true, error: "Konum için enlem ve boylam gerekli." }, { status: 400 });
  }

  if (type === "CONTACT" && !hasContact(attachment)) {
    return NextResponse.json({ authenticated: true, error: "Kişi bilgisi için ad gerekli." }, { status: 400 });
  }

  if (type === "POLL" && (!message || pollOptions.length < 2)) {
    return NextResponse.json({ authenticated: true, error: "Anket için soru ve en az iki seçenek gerekli." }, { status: 400 });
  }

  const roomCode = normalizeRoomCode(body.roomCode);
  const room = await resolveChatRoom(roomCode);

  if (!room) {
    return NextResponse.json({ authenticated: true, error: "Sohbet odası bulunamadı." }, { status: 404 });
  }

  await prisma.chatMessage.create({
    data: {
      roomId: room.id,
      userId: user.id,
      type,
      body: message || getFallbackBody(type),
      attachment: attachment as Prisma.InputJsonValue | undefined,
      pollOptions: type === "POLL"
        ? {
            create: pollOptions.map((label, index) => ({
              label,
              sortOrder: index,
            })),
          }
        : undefined,
    },
  });
  await markChatPresence({ roomId: room.id, userId: user.id });

  const state = await getChatRoomState({ user, roomCode: room.code });

  return NextResponse.json({ authenticated: true, ...state });
}

function getFallbackBody(type: ReturnType<typeof normalizeChatMessageType>) {
  const labels = {
    TEXT: "",
    FILE: "Dosya paylaştı.",
    IMAGE: "Resim paylaştı.",
    VIDEO: "Video paylaştı.",
    LOCATION: "Konum paylaştı.",
    CONTACT: "Kişi bilgisi paylaştı.",
    POLL: "Anket açtı.",
  } satisfies Record<ReturnType<typeof normalizeChatMessageType>, string>;

  return labels[type];
}
