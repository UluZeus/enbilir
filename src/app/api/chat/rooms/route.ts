import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { createPrivateChatRoom, getChatRoomState, normalizeRoomCode } from "@/lib/chat";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  const url = new URL(request.url);
  const roomCode = normalizeRoomCode(url.searchParams.get("roomCode"));
  const state = await getChatRoomState({ user, roomCode });

  if (!state) {
    return NextResponse.json({ authenticated: true, error: "Sohbet odası bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ authenticated: true, ...state });
}

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: { name?: unknown };

  try {
    body = await request.json() as { name?: unknown };
  } catch {
    body = {};
  }

  const room = await createPrivateChatRoom({
    userId: user.id,
    name: typeof body.name === "string" ? body.name : undefined,
  });
  const state = await getChatRoomState({ user, roomCode: room.code });

  return NextResponse.json({ authenticated: true, created: true, ...state });
}
