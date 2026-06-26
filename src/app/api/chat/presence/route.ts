import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getChatRoomState, normalizeRoomCode, resolveChatRoom, markChatPresence } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: { roomCode?: unknown };

  try {
    body = await request.json() as { roomCode?: unknown };
  } catch {
    body = {};
  }

  const roomCode = normalizeRoomCode(body.roomCode);
  const room = await resolveChatRoom(roomCode);

  if (!room) {
    return NextResponse.json({ authenticated: true, error: "Sohbet odası bulunamadı." }, { status: 404 });
  }

  await markChatPresence({ roomId: room.id, userId: user.id });
  const state = await getChatRoomState({ user, roomCode: room.code });

  return NextResponse.json({ authenticated: true, ...state });
}
