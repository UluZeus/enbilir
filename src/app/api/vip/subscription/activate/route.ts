import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { activateVipSubscription } from "@/lib/vip-subscription";

export const dynamic = "force-dynamic";

function isWebhookAuthorized(request: Request) {
  const expected = process.env.VIP_SUBSCRIPTION_WEBHOOK_SECRET;
  const received = request.headers.get("x-vip-webhook-secret") ?? "";

  if (!expected && process.env.NODE_ENV !== "production") {
    return true;
  }

  if (!expected || expected.length !== received.length) {
    return false;
  }

  return timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

function safeEqual(left: string, right: string) {
  return left.length === right.length && timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

function parseTryAmount(value: string) {
  const cleaned = value.replace(/[^0-9,.-]/g, "");
  const normalized = cleaned.includes(",") ? cleaned.replaceAll(".", "").replace(",", ".") : cleaned.replaceAll(",", "");
  return Number(normalized);
}

async function handleParamCallback(request: Request) {
  const clientCode = process.env.PARAM_CLIENT_CODE ?? "";
  const merchantGuid = process.env.PARAM_GUID ?? "";
  const form = await request.formData();
  const field = (name: string) => String(form.get(name) ?? "").trim();
  const result = field("TURKPOS_RETVAL_Sonuc");
  const callbackGuid = field("TURKPOS_RETVAL_GUID");
  const receiptId = field("TURKPOS_RETVAL_Dekont_ID");
  const amountText = field("TURKPOS_RETVAL_Tahsilat_Tutari");
  const orderId = field("TURKPOS_RETVAL_Siparis_ID");
  const transactionId = field("TURKPOS_RETVAL_Islem_ID");
  const postedHash = field("TURKPOS_RETVAL_Hash");
  const extData = field("TURKPOS_RETVAL_Ext_Data");
  const email = field("email") || field("Email") || extData.split("|")[0]?.trim();
  const expectedHash = createHash("sha1")
    .update(`${clientCode}${merchantGuid}${receiptId}${amountText}${orderId}${transactionId}`, "utf8")
    .digest("base64");

  if (!clientCode || !merchantGuid || !safeEqual(callbackGuid, merchantGuid) || !safeEqual(postedHash, expectedHash)) {
    return NextResponse.json({ error: "Param ödeme imzası doğrulanamadı." }, { status: 401 });
  }

  if (Number(result) <= 0 || Number(receiptId) <= 0) {
    return NextResponse.json({ error: "Param ödemesi başarılı değil." }, { status: 400 });
  }

  await activateVipSubscription({
    email,
    providerReference: `PARAM:${receiptId}`,
    amountTry: parseTryAmount(amountText),
    rawPayload: Object.fromEntries(form.entries()),
  });

  return NextResponse.redirect(new URL("/tr/vip?payment=success", request.url), 303);
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
    return handleParamCallback(request);
  }

  if (!isWebhookAuthorized(request)) {
    return NextResponse.json({ error: "Yetkisiz VIP ödeme bildirimi." }, { status: 401 });
  }

  try {
    const payload = await request.json() as {
      email?: string;
      providerReference?: string;
      amountTry?: number;
      paidAt?: string;
      months?: number;
    };
    const result = await activateVipSubscription({
      email: payload.email ?? "",
      providerReference: payload.providerReference ?? "",
      amountTry: Number(payload.amountTry),
      paidAt: payload.paidAt ? new Date(payload.paidAt) : undefined,
      months: payload.months,
      rawPayload: payload,
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "VIP üyelik etkinleştirilemedi." }, { status: 400 });
  }
}
