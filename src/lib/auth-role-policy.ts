import type { DisplayNameMode, Role } from "@/generated/prisma/enums";

export type SelfServiceRegistrationDefaults = {
  role: Role;
  nickname: null;
  displayNameMode: DisplayNameMode;
};

export function getSelfServiceRegistrationDefaults(verifiedEmail: string): SelfServiceRegistrationDefaults {
  void verifiedEmail;
  return {
    role: "USER",
    nickname: null,
    displayNameMode: "REAL_NAME",
  };
}
