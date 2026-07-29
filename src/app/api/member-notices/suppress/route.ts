import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  suppressMemberNotice,
  type MemberNoticeKind,
} from "@/lib/member-notices";

export const runtime = "nodejs";

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(request.url).origin);
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false, message: "Invalid request origin" }, { status: 403 });
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ ok: false, message: "Authentication required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { kind?: unknown } | null;
  if (body?.kind !== "ONBOARDING" && body?.kind !== "MONTHLY_SUPPORT") {
    return NextResponse.json({ ok: false, message: "Invalid notice kind" }, { status: 400 });
  }

  await suppressMemberNotice({
    userId: sessionUser.id,
    kind: body.kind as MemberNoticeKind,
  });

  return NextResponse.json({ ok: true });
}
