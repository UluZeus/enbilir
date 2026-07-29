import { createHash } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const paymentMocks = vi.hoisted(() => ({
  activateClaim: vi.fn(),
  revoke: vi.fn(),
}));

vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: ResponseInit) => Response.json(body, init),
  },
}));

vi.mock("@/lib/vip-subscription", () => ({
  revokeVipSubscription: paymentMocks.revoke,
}));

vi.mock("@/lib/vip-subscription-claims", () => ({
  activateVipSubscriptionClaimFromWebhook: paymentMocks.activateClaim,
}));

import { POST } from "./route";

const originalEnvironment = {
  secret: process.env.VIP_SUBSCRIPTION_WEBHOOK_SECRET,
  clientCode: process.env.PARAM_CLIENT_CODE,
  guid: process.env.PARAM_GUID,
};

describe("release gate: VIP payment callback authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.VIP_SUBSCRIPTION_WEBHOOK_SECRET = "release-gate-secret";
  });

  afterEach(() => {
    if (originalEnvironment.secret === undefined) delete process.env.VIP_SUBSCRIPTION_WEBHOOK_SECRET;
    else process.env.VIP_SUBSCRIPTION_WEBHOOK_SECRET = originalEnvironment.secret;
    if (originalEnvironment.clientCode === undefined) delete process.env.PARAM_CLIENT_CODE;
    else process.env.PARAM_CLIENT_CODE = originalEnvironment.clientCode;
    if (originalEnvironment.guid === undefined) delete process.env.PARAM_GUID;
    else process.env.PARAM_GUID = originalEnvironment.guid;
  });

  it("rejects an unsigned activation and never mutates entitlement", async () => {
    const response = await POST(new Request("http://localhost/api/vip/subscription/activate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        event: "PAID",
        claimId: "claim-1",
        providerReference: "PARAM-123456",
        amountTry: 100,
        currency: "TRY",
        payerEmail: "member@example.test",
      }),
    }));

    expect(response.status).toBe(401);
    expect(paymentMocks.activateClaim).not.toHaveBeenCalled();
    expect(paymentMocks.revoke).not.toHaveBeenCalled();
  });

  it("binds a signed activation to the submitted claim and payment reference", async () => {
    paymentMocks.activateClaim.mockResolvedValue({
      reused: false,
      paymentId: "payment-1",
      userId: "user-1",
    });

    const response = await POST(new Request("http://localhost/api/vip/subscription/activate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-vip-webhook-secret": "release-gate-secret",
      },
      body: JSON.stringify({
        event: "PAID",
        claimId: "claim-1",
        providerReference: "PARAM-123456",
        amountTry: 100,
        currency: "TRY",
        payerEmail: "member@example.test",
      }),
    }));

    expect(response.status).toBe(200);
    expect(paymentMocks.activateClaim).toHaveBeenCalledWith({
      claimId: "claim-1",
      providerReference: "PARAM-123456",
      amountTry: 100,
      currency: "TRY",
      payerEmail: "member@example.test",
      rawPayload: {
        event: "PAID",
        claimId: "claim-1",
        providerReference: "PARAM-123456",
        amountTry: 100,
        currency: "TRY",
        payerEmail: "member@example.test",
      },
    });
    expect(paymentMocks.revoke).not.toHaveBeenCalled();
  });

  it.each(["REFUNDED", "CHARGEBACK", "REVOKED"] as const)(
    "requires the same webhook authorization before %s cancellation",
    async (event) => {
      paymentMocks.revoke.mockResolvedValue({
        reused: false,
        paymentId: "payment-1",
        userId: "user-1",
      });

      const unauthorized = await POST(new Request("http://localhost/api/vip/subscription/activate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          event,
          provider: "PARAM",
          providerReference: "PARAM-123456",
        }),
      }));
      expect(unauthorized.status).toBe(401);
      expect(paymentMocks.revoke).not.toHaveBeenCalled();

      const authorized = await POST(new Request("http://localhost/api/vip/subscription/activate", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-vip-webhook-secret": "release-gate-secret",
        },
        body: JSON.stringify({
          event,
          provider: "PARAM",
          providerReference: "PARAM-123456",
        }),
      }));
      expect(authorized.status).toBe(200);
      expect(paymentMocks.revoke).toHaveBeenCalledWith({
        provider: "PARAM",
        providerReference: "PARAM-123456",
        reason: event,
      });
    },
  );

  it("refuses a valid-looking Param callback that has no account-bound claim", async () => {
    process.env.PARAM_CLIENT_CODE = "client";
    process.env.PARAM_GUID = "merchant-guid";
    const fields = {
      TURKPOS_RETVAL_Sonuc: "1",
      TURKPOS_RETVAL_GUID: "merchant-guid",
      TURKPOS_RETVAL_Dekont_ID: "123456",
      TURKPOS_RETVAL_Tahsilat_Tutari: "100.00",
      TURKPOS_RETVAL_Siparis_ID: "order-1",
      TURKPOS_RETVAL_Islem_ID: "transaction-1",
    };
    const postedHash = createHash("sha1")
      .update(
        `clientmerchant-guid${fields.TURKPOS_RETVAL_Dekont_ID}${fields.TURKPOS_RETVAL_Tahsilat_Tutari}${fields.TURKPOS_RETVAL_Siparis_ID}${fields.TURKPOS_RETVAL_Islem_ID}`,
        "utf8",
      )
      .digest("base64");
    const form = new URLSearchParams({ ...fields, TURKPOS_RETVAL_Hash: postedHash });

    const response = await POST(new Request("http://localhost/api/vip/subscription/activate", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: form,
    }));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "ACCOUNT_BOUND_CHECKOUT_REQUIRED",
    });
    expect(paymentMocks.activateClaim).not.toHaveBeenCalled();
  });
});
