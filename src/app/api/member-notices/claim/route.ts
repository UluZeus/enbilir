import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import {
  claimMemberNotice,
  isValidMemberNoticeEntryToken,
} from "@/lib/member-notices";
import { getParamVipPaymentUrl } from "@/lib/param-vip-payment";
import { consumeDurableRateLimit } from "@/lib/durable-rate-limit";

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

  const rateLimit = await consumeDurableRateLimit({
    scope: "member-notice-claim",
    identity: sessionUser.id,
    maxAttempts: 12,
    windowMs: 5 * 60 * 1000,
    blockMs: 5 * 60 * 1000,
  });
  if (!rateLimit.allowed) {
    const retryAfterSeconds = rateLimit.retryAt
      ? Math.max(1, Math.ceil((rateLimit.retryAt.getTime() - Date.now()) / 1000))
      : 300;
    return NextResponse.json(
      { ok: false, message: "Too many requests" },
      {
        status: 429,
        headers: {
          "Cache-Control": "private, no-store",
          "Retry-After": String(retryAfterSeconds),
        },
      },
    );
  }

  const body = await request.json().catch(() => null) as { entryToken?: unknown } | null;
  const entryToken = typeof body?.entryToken === "string" ? body.entryToken : "";
  if (!isValidMemberNoticeEntryToken(entryToken)) {
    return NextResponse.json({ ok: false, message: "Invalid entry token" }, { status: 400 });
  }

  const notice = await claimMemberNotice({
    userId: sessionUser.id,
    entryToken,
  });

  return NextResponse.json({
    ok: true,
    notice: notice
      ? {
        ...notice,
        paymentUrl: getParamVipPaymentUrl(),
      }
      : null,
  });
}
