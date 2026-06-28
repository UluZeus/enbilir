import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { getChatRoomState, normalizeRoomCode } from "@/lib/chat";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ authenticated: false, error: "Oturum bulunamadı." }, { status: 401 });
  }

  let body: { userId?: unknown; roomCode?: unknown };

  try {
    body = await request.json() as { userId?: unknown; roomCode?: unknown };
  } catch {
    return NextResponse.json({ authenticated: true, error: "Geçersiz istek." }, { status: 400 });
  }

  const blockedUserId = typeof body.userId === "string" ? body.userId : "";
  const roomCode = normalizeRoomCode(body.roomCode);

  if (!blockedUserId || blockedUserId === user.id) {
    return NextResponse.json({ authenticated: true, error: "Engellenecek kullanıcı geçerli değil." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({ where: { id: blockedUserId }, select: { id: true } });

  if (!target) {
    return NextResponse.json({ authenticated: true, error: "Kullanıcı bulunamadı." }, { status: 404 });
  }

  await prisma.chatUserBlock.upsert({
    where: {
      blockerUserId_blockedUserId: {
        blockerUserId: user.id,
        blockedUserId,
      },
    },
    create: {
      blockerUserId: user.id,
      blockedUserId,
    },
    update: {},
  });

  const state = await getChatRoomState({ user, roomCode });

  return NextResponse.json({ authenticated: true, ...state });
}
