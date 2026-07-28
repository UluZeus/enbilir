import bcrypt from "bcryptjs";
import type { Locale } from "@/i18n/config";
import {
  buildEmailVerificationUrl,
  buildWelcomeVerificationEmail,
  createEmailVerificationToken,
} from "@/lib/email-verification";

const REGISTRATION_EMAIL_COOLDOWN_MS = 5 * 60 * 1000;
const REGISTRATION_EMAIL_FAILED_MESSAGE = "Doğrulama e-postası gönderilemedi.";
const REGISTRATION_TIMING_DUMMY_PASSWORD = "enbilir-registration-timing-padding";

type PasswordHasher = (value: string, rounds: number) => Promise<string>;

export function hashRegistrationPassword(
  password: string,
  userExists: boolean,
  hash: PasswordHasher = bcrypt.hash,
) {
  return hash(userExists ? REGISTRATION_TIMING_DUMMY_PASSWORD : password, 12);
}

type PendingRegistrationUser = {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  emailVerifiedAt: Date | null;
  emailVerificationTokenHash: string | null;
  emailVerificationExpiresAt: Date | null;
  emailVerificationSentAt: Date | null;
};

type RotateInput = {
  userId: string;
  expectedTokenHash: string | null;
  expectedSentAt: Date | null;
  tokenHash: string;
  expiresAt: Date;
  sentAt: Date;
};

type RollbackInput = {
  userId: string;
  failedTokenHash: string;
  failedSentAt: Date;
  previousTokenHash: string | null;
  previousExpiresAt: Date | null;
  previousSentAt: Date | null;
};

type SendInput = {
  to: string;
  subject: string;
  text: string;
  html: string;
};

export async function resendPendingRegistrationEmail({
  user,
  locale,
  now,
  targetAllowed = true,
  rotate,
  rollback,
  send,
}: {
  user: PendingRegistrationUser;
  locale: Locale;
  now: Date;
  targetAllowed?: boolean;
  rotate: (input: RotateInput) => Promise<boolean>;
  rollback: (input: RollbackInput) => Promise<boolean>;
  send: (input: SendInput) => Promise<unknown>;
}) {
  if (user.isActive || user.emailVerifiedAt) {
    return { status: "not-pending" as const };
  }

  if (!targetAllowed) {
    return { status: "target-limited" as const };
  }

  if (
    user.emailVerificationSentAt
    && now.getTime() - user.emailVerificationSentAt.getTime() < REGISTRATION_EMAIL_COOLDOWN_MS
  ) {
    return { status: "cooldown" as const };
  }

  const { token, tokenHash, expiresAt } = createEmailVerificationToken();
  const rotated = await rotate({
    userId: user.id,
    expectedTokenHash: user.emailVerificationTokenHash,
    expectedSentAt: user.emailVerificationSentAt,
    tokenHash,
    expiresAt,
    sentAt: now,
  });

  if (!rotated) {
    return { status: "concurrent" as const };
  }

  const verificationUrl = buildEmailVerificationUrl(token, locale);
  const message = buildWelcomeVerificationEmail({
    name: user.name,
    verificationUrl,
    locale,
  });

  try {
    await send({ to: user.email, ...message });
  } catch (error) {
    try {
      await rollback({
        userId: user.id,
        failedTokenHash: tokenHash,
        failedSentAt: now,
        previousTokenHash: user.emailVerificationTokenHash,
        previousExpiresAt: user.emailVerificationExpiresAt,
        previousSentAt: user.emailVerificationSentAt,
      });
    } catch {
      console.error("[auth-registration-email]", {
        event: "verification_token_rollback_failed",
      });
    }

    throw new Error(REGISTRATION_EMAIL_FAILED_MESSAGE, { cause: error });
  }

  return { status: "sent" as const };
}
