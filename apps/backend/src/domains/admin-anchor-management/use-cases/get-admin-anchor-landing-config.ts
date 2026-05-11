import { HTTPException } from "hono/http-exception";
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
    throw new HTTPException(404, { message: "Anchor event not found" });
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
