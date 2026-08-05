import { describe, expect, it } from "vitest";

import { Prisma } from "@/generated/prisma/client";
import { decimal, decimalToNumber, nullableDecimalToNumber } from "@/lib/decimal";

describe("Decimal boundaries", () => {
  it("keeps accounting arithmetic in decimal space", () => {
    const result = decimal("0.1").plus(decimal("0.2"));

    expect(result.equals(new Prisma.Decimal("0.3"))).toBe(true);
    expect(result.toString()).toBe("0.3");
  });

  it("converts only explicit presentation boundaries to finite numbers", () => {
    expect(decimalToNumber(new Prisma.Decimal("1234.5678"))).toBe(1234.5678);
    expect(nullableDecimalToNumber(null)).toBeNull();
    expect(() => decimalToNumber(new Prisma.Decimal("1e1000"))).toThrow("finite");
  });
});
