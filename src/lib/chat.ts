import { randomBytes } from "crypto";
import type { ChatMessageType } from "@/generated/prisma/enums";
import type { ChatRoomType } from "@/generated/prisma/enums";
import type { SessionUser } from "@/lib/auth";
import { getDisplayName } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const generalChatRoomCode = "genel";
export const chatOnlineWindowMs = 45_000;
const chatMessageLimit = 80;
const chatMessageTypes = new Set<ChatMessageType>(["TEXT", "FILE", "IMAGE", "VIDEO", "LOCATION", "CONTACT", "POLL"]);

type ChatUser = Pick<SessionUser, "name" | "nickname" | "displayNameMode">;

export function getChatDisplayName(user: ChatUser) {
  return getDisplayName(user).trim() || "Enbilir Üyesi";
}

export function normalizeRoomCode(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function normalizeChatMessage(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim().slice(0, 800);
}

export function normalizeChatMessageType(value: unknown): ChatMessageType {
  return typeof value === "string" && chatMessageTypes.has(value as ChatMessageType) ? value as ChatMessageType : "TEXT";
}

export function normalizeChatAttachment(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

export async function ensureGeneralChatRoom() {
  return prisma.chatRoom.upsert({
    where: { code: generalChatRoomCode },
    update: { name: "Genel Sohbet" },
    create: {
      code: generalChatRoomCode,
      name: "Genel Sohbet",
      type: "GENERAL",
    },
  });
}

async function createUniquePrivateRoomCode() {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const code = `oda-${randomBytes(4).toString("hex")}`;
    const existing = await prisma.chatRoom.findUnique({ where: { code }, select: { id: true } });

    if (!existing) {
      return code;
    }
  }

  return `oda-${Date.now().toString(36)}-${randomBytes(2).toString("hex")}`;
}

export async function createPrivateChatRoom({ userId, name }: { userId: string; name?: string }) {
  const roomName = name?.trim().slice(0, 60) || "Özel Sohbet Odası";
  const room = await prisma.chatRoom.create({
    data: {
      code: await createUniquePrivateRoomCode(),
      name: roomName,
      type: "PRIVATE",
      createdByUserId: userId,
    },
  });

  await markChatPresence({ roomId: room.id, userId });

  return room;
}

export async function resolveChatRoom(roomCode?: string) {
  const code = normalizeRoomCode(roomCode);

  if (!code || code === generalChatRoomCode) {
    return ensureGeneralChatRoom();
  }

  return prisma.chatRoom.findUnique({ where: { code } });
}

export async function markChatPresence({ roomId, userId }: { roomId: string; userId: string }) {
  return prisma.chatPresence.upsert({
    where: {
      roomId_userId: {
        roomId,
        userId,
      },
    },
    update: {
      lastSeenAt: new Date(),
    },
    create: {
      roomId,
      userId,
      lastSeenAt: new Date(),
    },
  });
}

function serializeRoom(room: { id: string; code: string; name: string; type: ChatRoomType }) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    type: room.type,
  };
}

export async function getVisibleChatRooms(userId: string) {
  const generalRoom = await ensureGeneralChatRoom();
  const [createdRooms, visitedRooms] = await Promise.all([
    prisma.chatRoom.findMany({
      where: { type: "PRIVATE", createdByUserId: userId },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.chatPresence.findMany({
      where: { userId, room: { type: "PRIVATE" } },
      include: { room: true },
      orderBy: { lastSeenAt: "desc" },
      take: 20,
    }),
  ]);
  const rooms = new Map<string, ReturnType<typeof serializeRoom>>();
  rooms.set(generalRoom.code, serializeRoom(generalRoom));

  for (const room of createdRooms) {
    rooms.set(room.code, serializeRoom(room));
  }

  for (const presence of visitedRooms) {
    rooms.set(presence.room.code, serializeRoom(presence.room));
  }

  return Array.from(rooms.values());
}

export async function getChatRoomState({ user, roomCode }: { user: SessionUser; roomCode?: string }) {
  const room = await resolveChatRoom(roomCode);

  if (!room) {
    return null;
  }

  await markChatPresence({ roomId: room.id, userId: user.id });

  const onlineSince = new Date(Date.now() - chatOnlineWindowMs);
  const blocks = await prisma.chatUserBlock.findMany({
    where: {
      OR: [
        { blockerUserId: user.id },
        { blockedUserId: user.id },
      ],
    },
    select: { blockerUserId: true, blockedUserId: true },
  });
  const blockedUserIds = new Set(
    blocks.map((block) => block.blockerUserId === user.id ? block.blockedUserId : block.blockerUserId),
  );
  const [messages, onlinePresences, rooms] = await Promise.all([
    prisma.chatMessage.findMany({
      where: {
        roomId: room.id,
        hiddenAt: null,
        userId: blockedUserIds.size > 0 ? { notIn: Array.from(blockedUserIds) } : undefined,
      },
      include: {
        user: {
          select: { id: true, name: true, nickname: true, displayNameMode: true },
        },
        reports: {
          where: { reporterId: user.id },
          select: { id: true },
        },
        pollOptions: {
          orderBy: { sortOrder: "asc" },
          include: {
            votes: {
              select: { userId: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: chatMessageLimit,
    }),
    prisma.chatPresence.findMany({
      where: {
        roomId: room.id,
        lastSeenAt: { gte: onlineSince },
        userId: blockedUserIds.size > 0 ? { notIn: Array.from(blockedUserIds) } : undefined,
      },
      include: {
        user: {
          select: { id: true, name: true, nickname: true, displayNameMode: true },
        },
      },
      orderBy: { lastSeenAt: "desc" },
    }),
    getVisibleChatRooms(user.id),
  ]);

  return {
    room: serializeRoom(room),
    rooms,
    messages: messages.reverse().map((message) => {
      const totalVotes = message.pollOptions.reduce((sum, option) => sum + option.votes.length, 0);

      return {
        id: message.id,
        type: message.type,
        body: message.body,
        attachment: message.attachment as Record<string, unknown> | null,
        createdAt: message.createdAt.toISOString(),
        author: {
          id: message.user.id,
          displayName: getChatDisplayName(message.user),
        },
        isMine: message.userId === user.id,
        reportedByMe: message.reports.length > 0,
        reportCount: message.reportCount,
        poll: message.type === "POLL"
          ? {
              totalVotes,
              options: message.pollOptions.map((option) => ({
                id: option.id,
                label: option.label,
                voteCount: option.votes.length,
                votedByMe: option.votes.some((vote) => vote.userId === user.id),
              })),
            }
          : null,
      };
    }),
    onlineUsers: onlinePresences.map((presence) => ({
      id: presence.user.id,
      displayName: getChatDisplayName(presence.user),
      lastSeenAt: presence.lastSeenAt.toISOString(),
      isMe: presence.userId === user.id,
    })),
    currentUser: {
      id: user.id,
      displayName: getChatDisplayName(user),
    },
  };
}
