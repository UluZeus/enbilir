import "server-only";

import { resolveRuntimeEnvironment } from "@/lib/operations/runtime-config";

const PARAM_PAYMENT_ORIGIN = "https://isyerim.param.com.tr";
const PARAM_PAYMENT_FRAGMENT = /^#\/paymentform\/paymentrequest\/[A-Za-z0-9=_-]{4,256}$/;

export function validateParamVipPaymentUrl(value: string) {
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error("PARAM_VIP_PAYMENT_URL geçerli bir URL olmalıdır.");
  }

  if (
    url.origin !== PARAM_PAYMENT_ORIGIN
    || url.pathname !== "/"
    || url.search
    || url.username
    || url.password
    || !PARAM_PAYMENT_FRAGMENT.test(url.hash)
  ) {
    throw new Error("PARAM_VIP_PAYMENT_URL yalnızca doğrulanmış Param ödeme formunu göstermelidir.");
  }

  return url.toString();
}

export function getParamVipPaymentUrl({
  env = process.env,
  value = env.PARAM_VIP_PAYMENT_URL,
}: {
  env?: NodeJS.ProcessEnv;
  value?: string;
} = {}) {
  if (resolveRuntimeEnvironment(env) !== "production") {
    return null;
  }

  if (!value?.trim()) {
    throw new Error("Production için PARAM_VIP_PAYMENT_URL tanımlanmalıdır.");
  }

  return validateParamVipPaymentUrl(value.trim());
}
