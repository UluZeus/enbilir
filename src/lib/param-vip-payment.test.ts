import { afterEach, describe, expect, it, vi } from "vitest";

import {
  getParamVipPaymentUrl,
  validateParamVipPaymentUrl,
} from "@/lib/param-vip-payment";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Param VIP payment runtime configuration", () => {
  it("never exposes a payment URL outside production", () => {
    expect(getParamVipPaymentUrl({
      env: { NODE_ENV: "test" },
      value: "https://isyerim.param.com.tr/#/paymentform/paymentrequest/SYNTHETIC_token-123",
    })).toBeNull();
  });

  it("never exposes the production link in a staging app runtime", () => {
    expect(getParamVipPaymentUrl({
      env: {
        NODE_ENV: "production",
        ENBILIR_ENV: "staging",
      },
      value: "https://isyerim.param.com.tr/#/paymentform/paymentrequest/SYNTHETIC_token-123",
    })).toBeNull();
  });

  it("accepts only the exact HTTPS Param payment-request URL shape", () => {
    const valid = "https://isyerim.param.com.tr/#/paymentform/paymentrequest/SYNTHETIC_token-123";

    expect(validateParamVipPaymentUrl(valid)).toBe(valid);
    expect(() => validateParamVipPaymentUrl("http://isyerim.param.com.tr/#/paymentform/paymentrequest/token")).toThrow();
    expect(() => validateParamVipPaymentUrl("https://evil.example/#/paymentform/paymentrequest/token")).toThrow();
    expect(() => validateParamVipPaymentUrl("https://isyerim.param.com.tr/paymentform/paymentrequest/token")).toThrow();
    expect(() => validateParamVipPaymentUrl("https://isyerim.param.com.tr/#/other/token")).toThrow();
  });

  it("fails closed in production when the URL is missing or invalid", () => {
    const production = {
      NODE_ENV: "production",
      ENBILIR_ENV: "production",
    } satisfies NodeJS.ProcessEnv;
    expect(() => getParamVipPaymentUrl({ env: production, value: undefined })).toThrow("PARAM_VIP_PAYMENT_URL");
    expect(() => getParamVipPaymentUrl({
      env: production,
      value: "https://example.test/payment",
    })).toThrow("PARAM_VIP_PAYMENT_URL");
  });
});
