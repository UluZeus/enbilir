import { NextResponse } from "next/server";
import { sendVipResearchTestEmail } from "@/lib/vip-research/email";
import { resolveVipResearchTestRecipient } from "@/lib/vip-research/test-recipient";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function isAuthorized(request: Request) {
  const secret = process.env.AI_AGENT_CRON_SECRET;
  return Boolean(secret && request.headers.get("x-ai-agent-secret") === secret);
}

export async function POST(request: Request) {
  if (process.env.VIP_RESEARCH_TEST_EMAIL_ENABLED !== "true") {
    return NextResponse.json({ error: "VIP test e-postası geçici olarak kapalı." }, { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Yetkisiz VIP test e-postası isteği." }, { status: 401 });
  }

  try {
    const recipient = resolveVipResearchTestRecipient(process.env.MASTER_ADMIN_EMAIL);
    const result = await sendVipResearchTestEmail({
      to: recipient.email,
      name: recipient.name,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "VIP test e-postası gönderilemedi.",
    }, { status: 500 });
  }
}
