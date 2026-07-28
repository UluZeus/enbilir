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
  return typeof attachment?.url === "string" && (
    attachment.url.startsWith("/uploads/chat/") ||
    attachment.url.startsWith("/api/chat/uploads/")
  );
}

function getStagedUploadName(attachment: Record<string, unknown> | null) {
  if (typeof attachment?.url !== "string" || !attachment.url.startsWith("/api/chat/uploads/")) {
    return null;
  }

  const storedName = decodeURIComponent(attachment.url.slice("/api/chat/uploads/".length));
  return /^[a-f0-9]{32}-[\w.-]{1,80}$/i.test(storedName) ? storedName : null;
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
  const stagedUploadName = getStagedUploadName(attachment);
  const pollOptions = normalizePollOptions(body.pollOptions);

  if (type === "TEXT" && !message) {
    return NextResponse.json({ authenticated: true, error: "Boş mesaj gönderilemez." }, { status: 400 });
  }

  if ((type === "FILE" || type === "IMAGE" || type === "VIDEO") && !hasAttachmentUrl(attachment)) {
    return NextResponse.json({ authenticated: true, error: "Dosya yüklenmeden mesaj gönderilemez." }, { status: 400 });
  }

  if (
    (type === "FILE" || type === "IMAGE" || type === "VIDEO") &&
    typeof attachment?.url === "string" &&
    attachment.url.startsWith("/api/chat/uploads/") &&
    !stagedUploadName
  ) {
    return NextResponse.json({ authenticated: true, error: "Yüklenen dosya adresi geçersiz." }, { status: 400 });
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

  try {
    await prisma.$transaction(async (transaction) => {
      if (stagedUploadName) {
        const linked = await transaction.chatUpload.updateMany({
          where: {
            storedName: stagedUploadName,
            userId: user.id,
            status: "STAGED",
            expiresAt: { gt: new Date() },
          },
          data: { status: "LINKED", linkedAt: new Date() },
        });
        if (linked.count !== 1) throw new Error("Yüklenen dosyanın süresi dolmuş veya dosya daha önce kullanılmış.");
      }

      await transaction.chatMessage.create({
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
    });
  } catch (error) {
    return NextResponse.json(
      { authenticated: true, error: error instanceof Error ? error.message : "Mesaj gönderilemedi." },
      { status: 400 },
    );
  }
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
