import { issueAuthForUser } from "../../../auth/middleware";
import { createLocalUserWithGeneratedPin } from "../../pr-core/services/user-pin-auth.service";

export type LocalRegistrationResult = {
  role: "authenticated" | "service";
  userId: string;
  userPin: string;
  accessToken: string;
};

export async function registerLocalUser(): Promise<LocalRegistrationResult> {
  const created = await createLocalUserWithGeneratedPin();
  const authenticated = issueAuthForUser(created.user);

  return {
    role: "authenticated",
    userId: created.user.id,
    userPin: created.userPin,
    accessToken: authenticated.token,
  };
}
