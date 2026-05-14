import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { ConfigRepository } from "../../../repositories/ConfigRepository";
import type { AnchorEventId } from "../../../entities";
import {
  getAnchorEventLandingConfigKey,
  normalizeAnchorEventLandingConfig,
  serializeAnchorEventLandingConfig,
  type AnchorEventLandingConfig,
} from "../../anchor-event/landing-config";
import type { AdminAnchorLandingConfigResponse } from "./get-admin-anchor-landing-config";

const anchorEventRepo = new AnchorEventRepository();
const configRepo = new ConfigRepository();

export async function updateAdminAnchorLandingConfig(
  eventId: AnchorEventId,
  input: AnchorEventLandingConfig,
): Promise<AdminAnchorLandingConfigResponse> {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  const config = normalizeAnchorEventLandingConfig(input);
  await configRepo.upsertValueByKey(
    getAnchorEventLandingConfigKey(eventId),
    serializeAnchorEventLandingConfig(config),
  );

  return {
    event: {
      id: event.id,
      title: event.title,
    },
    config,
  };
}
