import { eq } from "drizzle-orm";
import {
  partnerRequests,
  users,
  type PRJoinGateConfig,
} from "../../../../src/entities";
import { getTestDb } from "../../../_infra/probes/sql-probe";
import type { ScenarioPartnerRequest } from "../builders/partner-requests";
import type { ScenarioUser } from "../builders/users";

export async function configureJoinGate(input: {
  pr: ScenarioPartnerRequest;
  config: PRJoinGateConfig;
}): Promise<void> {
  await getTestDb()
    .update(partnerRequests)
    .set({ joinGateConfig: input.config })
    .where(eq(partnerRequests.id, input.pr.id));
}

export async function configureOpenConfirmationWindow(
  pr: ScenarioPartnerRequest,
): Promise<void> {
  const startsAt = new Date(Date.now() + 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);

  await getTestDb()
    .update(partnerRequests)
    .set({
      time: [startsAt.toISOString(), endsAt.toISOString()],
      confirmationStartOffsetMinutes: 120,
      confirmationEndOffsetMinutes: 30,
      joinLockOffsetMinutes: 30,
    })
    .where(eq(partnerRequests.id, pr.id));
}

export async function bindScenarioWeChatOpenId(input: {
  user: ScenarioUser;
  openId: string;
}): Promise<void> {
  await getTestDb()
    .update(users)
    .set({ openId: input.openId })
    .where(eq(users.id, input.user.user.id));
}
