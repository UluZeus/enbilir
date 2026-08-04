import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const readSource = (fileName: string) =>
  readFileSync(path.join(process.cwd(), "src", fileName), "utf8");

describe("Next instrumentation runtime boundary", () => {
  it("loads Node-only runtime validation through a conditional relative module", () => {
    const instrumentation = readSource("instrumentation.ts");
    const nodeInstrumentation = readSource("instrumentation-node.ts");

    expect(instrumentation).toContain('process.env.NEXT_RUNTIME === "nodejs"');
    expect(instrumentation).toContain('await import("./instrumentation-node")');
    expect(instrumentation).not.toContain("@/lib/operations/runtime-config");
    expect(nodeInstrumentation).toContain('from "@/lib/operations/runtime-config"');
    expect(nodeInstrumentation).toContain("assertValidRuntimeConfig()");
  });
});
