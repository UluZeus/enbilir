export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertValidRuntimeConfig } = await import("@/lib/operations/runtime-config");
  assertValidRuntimeConfig();
}
