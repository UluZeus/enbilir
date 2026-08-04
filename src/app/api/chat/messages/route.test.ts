import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  getAccessibleChatRoom: vi.fn(),
  getChatRoomState: vi.fn(),
  markChatPresence: vi.fn(),
  transaction: vi.fn(),
  chatMessageCreate: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
vi.mock("@/lib/auth", () => ({ getSessionUser: routeMocks.getSessionUser }));
vi.mock("@/lib/chat", () => ({
  getAccessibleChatRoom: routeMocks.getAccessibleChatRoom,
  getChatRoomState: routeMocks.getChatRoomState,
  markChatPresence: routeMocks.markChatPresence,
  normalizeChatAttachment: () => null,
  normalizeChatMessage: (value: unknown) => typeof value === "string" ? value.trim() : "",
  normalizeChatMessageType: () => "TEXT",
  normalizeRoomCode: (value: unknown) => typeof value === "string" ? value.trim().toLowerCase() : "",
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: routeMocks.transaction,
  },
}));

import { POST } from "./route";

function request(roomCode: string) {
  return new Request("http://localhost/api/chat/messages", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ roomCode, message: "Synthetic message" }),
  });
}

describe("chat message route private-room access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getSessionUser.mockResolvedValue({
      id: "outsider-1",
      name: "Outsider",
      email: "outsider@example.test",
    });
    routeMocks.getAccessibleChatRoom.mockResolvedValue(null);
  });

  it("does not let another authenticated user write to a guessed private room", async () => {
    const response = await POST(request("oda-synthetic-secret"));

    expect(response.status).toBe(404);
    expect(routeMocks.transaction).not.toHaveBeenCalled();
    expect(routeMocks.markChatPresence).not.toHaveBeenCalled();
  });

  it("allows an explicitly authorized private-room member to post", async () => {
    routeMocks.getSessionUser.mockResolvedValueOnce({
      id: "member-1",
      name: "Member",
      email: "member@example.test",
    });
    routeMocks.getAccessibleChatRoom.mockResolvedValueOnce({
      id: "private-room-1",
      code: "oda-synthetic-secret",
      type: "PRIVATE",
    });
    routeMocks.transaction.mockImplementationOnce(async (callback) => callback({
      chatMessage: { create: routeMocks.chatMessageCreate },
      chatUpload: { updateMany: vi.fn() },
    }));
    routeMocks.getChatRoomState.mockResolvedValueOnce({ room: { code: "oda-synthetic-secret" } });

    const response = await POST(request("oda-synthetic-secret"));

    expect(response.status).toBe(200);
    expect(routeMocks.chatMessageCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ roomId: "private-room-1", userId: "member-1" }),
    }));
  });
});
