import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const maxSerializableAttempts = 3;

export function isRetryableTransactionConflict(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
}

export async function withSerializableTransaction<T>(
  callback: (transaction: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 1; attempt <= maxSerializableAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(callback, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (!isRetryableTransactionConflict(error) || attempt === maxSerializableAttempts) {
        throw error;
      }
    }
  }

  throw new Error("Serializable transaction retry loop exhausted unexpectedly.");
}
