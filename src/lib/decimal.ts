import { Prisma } from "@/generated/prisma/client";

export type DecimalValue = Prisma.Decimal | number | string;

export function decimal(value: DecimalValue) {
  return value instanceof Prisma.Decimal ? value : new Prisma.Decimal(value);
}

export function decimalToNumber(value: DecimalValue) {
  const result = decimal(value).toNumber();

  if (!Number.isFinite(result)) {
    throw new Error("Decimal presentation value must be finite.");
  }

  return result;
}

export function nullableDecimalToNumber(value: DecimalValue | null | undefined) {
  return value === null || value === undefined ? null : decimalToNumber(value);
}

export function roundDecimal(value: DecimalValue, decimalPlaces: number) {
  return decimal(value).toDecimalPlaces(decimalPlaces, Prisma.Decimal.ROUND_HALF_UP);
}
