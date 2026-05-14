import { throwHttpProblem } from "../../../lib/problem-details";
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
    return throwHttpProblem({ status: 404, detail: "Anchor event not found" });
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
