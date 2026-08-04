import { beforeEach, describe, expect, it, vi } from "vitest";

const routeMocks = vi.hoisted(() => ({
  getSessionUser: vi.fn(),
  canAccessChatRoom: vi.fn(),
  chatUploadFindUnique: vi.fn(),
  chatMessageFindFirst: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: { json: (body: unknown, init?: ResponseInit) => Response.json(body, init) },
}));
vi.mock("@/lib/auth", () => ({ getSessionUser: routeMocks.getSessionUser }));
vi.mock("@/lib/chat", () => ({ canAccessChatRoom: routeMocks.canAccessChatRoom }));
vi.mock("@/lib/chat-upload-policy", () => ({
  detectAllowedChatUpload: vi.fn(),
  getChatUploadFormatForExtension: vi.fn(),
  getChatUploadResponseHeaders: vi.fn(),
  resolvePrivateChatUploadPath: vi.fn(),
}));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    chatUpload: { findUnique: routeMocks.chatUploadFindUnique },
    chatMessage: { findFirst: routeMocks.chatMessageFindFirst },
  },
}));

import { GET } from "./route";

describe("linked chat uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    routeMocks.getSessionUser.mockResolvedValue({ id: "outsider-1", email: "outsider@example.test" });
    routeMocks.chatUploadFindUnique.mockResolvedValue({
      userId: "owner-1",
      status: "LINKED",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
    });
    routeMocks.chatMessageFindFirst.mockResolvedValue({
      room: { id: "private-room-1", type: "PRIVATE", createdByUserId: "owner-1" },
    });
    routeMocks.canAccessChatRoom.mockResolvedValue(false);
  });

  it("does not serve a linked private-room file to a user who only guessed its name", async () => {
    const response = await GET(
      new Request("http://localhost/api/chat/uploads/synthetic-file.pdf"),
      { params: Promise.resolve({ fileName: "synthetic-file.pdf" }) },
    );

    expect(response.status).toBe(404);
    expect(routeMocks.canAccessChatRoom).toHaveBeenCalledWith({
      room: { id: "private-room-1", type: "PRIVATE", createdByUserId: "owner-1" },
      userId: "outsider-1",
    });
  });
});
