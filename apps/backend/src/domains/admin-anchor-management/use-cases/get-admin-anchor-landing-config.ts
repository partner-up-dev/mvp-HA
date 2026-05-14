import { throwHttpProblem } from "../../../lib/problem-details";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { ConfigRepository } from "../../../repositories/ConfigRepository";
import type { AnchorEventId } from "../../../entities";
import {
  getAnchorEventLandingConfigKey,
  parseAnchorEventLandingConfig,
  type AnchorEventLandingConfig,
} from "../../anchor-event/landing-config";

const anchorEventRepo = new AnchorEventRepository();
const configRepo = new ConfigRepository();

export interface AdminAnchorLandingConfigResponse {
  event: {
    id: number;
    title: string;
  };
  config: AnchorEventLandingConfig;
}

export async function getAdminAnchorLandingConfig(
  eventId: AnchorEventId,
): Promise<AdminAnchorLandingConfigResponse> {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
  }

  const config = parseAnchorEventLandingConfig(
    await configRepo.findValueByKey(getAnchorEventLandingConfigKey(eventId)),
  );

  return {
    event: {
      id: event.id,
      title: event.title,
    },
    config,
  };
}
