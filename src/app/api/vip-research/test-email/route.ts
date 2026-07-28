import { NextResponse } from "next/server";
import { sendVipResearchTestEmail } from "@/lib/vip-research/email";
import { resolveVipResearchTestRecipient } from "@/lib/vip-research/test-recipient";
import { isCronRequestAuthorized } from "@/lib/cron-auth";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function POST(request: Request) {
  if (process.env.VIP_RESEARCH_TEST_EMAIL_ENABLED !== "true") {
    return NextResponse.json({ error: "VIP test e-postası geçici olarak kapalı." }, { status: 404 });
  }

  if (!isCronRequestAuthorized(request, {
    envName: "VIP_RESEARCH_TEST_CRON_SECRET",
    headerName: "x-vip-research-test-secret",
  })) {
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
