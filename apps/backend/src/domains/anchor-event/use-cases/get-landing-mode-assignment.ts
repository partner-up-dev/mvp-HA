import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { ConfigRepository } from "../../../repositories/ConfigRepository";
import type { AnchorEventId } from "../../../entities/anchor-event";
import {
  assignAnchorEventLandingModeFromConfig,
  getAnchorEventLandingConfigKey,
  parseAnchorEventLandingConfig,
  type AnchorEventLandingAssignment,
} from "../landing-config";

const eventRepo = new AnchorEventRepository();
const configRepo = new ConfigRepository();

export async function assignAnchorEventLandingMode(
  eventId: AnchorEventId,
): Promise<AnchorEventLandingAssignment> {
  const event = await eventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const config = parseAnchorEventLandingConfig(
    await configRepo.findValueByKey(getAnchorEventLandingConfigKey(eventId)),
  );

  return {
    eventId: event.id,
    mode: assignAnchorEventLandingModeFromConfig(config),
    assignmentRevision: config.assignmentRevision,
  };
}
