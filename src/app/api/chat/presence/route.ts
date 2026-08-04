import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getChatRoomState, normalizeRoomCode } from "@/lib/chat";

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
  const state = await getChatRoomState({ user, roomCode });

  if (!state) {
    return NextResponse.json({ authenticated: true, error: "Sohbet odası bulunamadı." }, { status: 404 });
  }

  return NextResponse.json({ authenticated: true, ...state });
}
