import { beforeEach, describe, expect, it, vi } from "vitest";

const chatMocks = vi.hoisted(() => ({
  chatRoomFindUnique: vi.fn(),
  chatRoomUpsert: vi.fn(),
  chatRoomMembershipFindUnique: vi.fn(),
  chatRoomMembershipUpsert: vi.fn(),
  chatPresenceUpsert: vi.fn(),
  chatUserBlockFindMany: vi.fn(),
  chatMessageFindMany: vi.fn(),
  chatPresenceFindMany: vi.fn(),
  chatRoomMembershipFindMany: vi.fn(),
  chatRoomFindMany: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({
  getDisplayName: (user: { name?: string }) => user.name ?? "Enbilir Üyesi",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatRoom: {
      findUnique: chatMocks.chatRoomFindUnique,
      findMany: chatMocks.chatRoomFindMany,
      upsert: chatMocks.chatRoomUpsert,
    },
    chatRoomMembership: {
      findUnique: chatMocks.chatRoomMembershipFindUnique,
      findMany: chatMocks.chatRoomMembershipFindMany,
      upsert: chatMocks.chatRoomMembershipUpsert,
    },
    chatPresence: {
      upsert: chatMocks.chatPresenceUpsert,
      findMany: chatMocks.chatPresenceFindMany,
    },
    chatUserBlock: { findMany: chatMocks.chatUserBlockFindMany },
    chatMessage: { findMany: chatMocks.chatMessageFindMany },
  },
}));

import { getChatRoomState } from "@/lib/chat";

const privateRoom = {
  id: "private-room-1",
  code: "oda-synthetic-secret",
  name: "Synthetic private room",
  type: "PRIVATE" as const,
  createdByUserId: "owner-1",
};

function sessionUser(id: string) {
  return {
    id,
    name: id,
    nickname: null,
    email: `${id}@example.test`,
    role: "USER" as const,
    membershipTier: "STANDARD" as const,
    displayNameMode: "REAL_NAME" as const,
  };
}

describe("private chat room access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    chatMocks.chatRoomFindUnique.mockResolvedValue(privateRoom);
    chatMocks.chatRoomUpsert.mockResolvedValue({
      id: "general-room-1",
      code: "genel",
      name: "Genel Sohbet",
      type: "GENERAL",
    });
    chatMocks.chatRoomMembershipFindUnique.mockResolvedValue(null);
    chatMocks.chatRoomMembershipUpsert.mockResolvedValue({ id: "membership-1" });
    chatMocks.chatPresenceUpsert.mockResolvedValue({ id: "presence-1" });
    chatMocks.chatUserBlockFindMany.mockResolvedValue([]);
    chatMocks.chatMessageFindMany.mockResolvedValue([]);
    chatMocks.chatPresenceFindMany.mockResolvedValue([]);
    chatMocks.chatRoomMembershipFindMany.mockResolvedValue([]);
    chatMocks.chatRoomFindMany.mockResolvedValue([]);
  });

  it("does not grant a guessed private room code implicit membership or history access", async () => {
    const state = await getChatRoomState({
      user: sessionUser("outsider-1"),
      roomCode: privateRoom.code,
    });

    expect(state).toBeNull();
    expect(chatMocks.chatRoomMembershipUpsert).not.toHaveBeenCalled();
    expect(chatMocks.chatPresenceUpsert).not.toHaveBeenCalled();
    expect(chatMocks.chatMessageFindMany).not.toHaveBeenCalled();
  });

  it("allows the room creator to read their private room without a duplicate membership", async () => {
    const state = await getChatRoomState({
      user: sessionUser("owner-1"),
      roomCode: privateRoom.code,
    });

    expect(state?.room.code).toBe(privateRoom.code);
    expect(chatMocks.chatRoomMembershipUpsert).not.toHaveBeenCalled();
  });

  it("allows an explicit private-room member to read the room", async () => {
    chatMocks.chatRoomMembershipFindUnique.mockResolvedValueOnce({ id: "membership-2" });

    const state = await getChatRoomState({
      user: sessionUser("member-1"),
      roomCode: privateRoom.code,
    });

    expect(state?.room.code).toBe(privateRoom.code);
  });
});
