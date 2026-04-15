import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type { AnchorEventId } from "../../../entities/anchor-event";
import {
  listDemandCards as listDemandCardSummaries,
  type DemandCardSummary,
} from "../services/demand-card-projection.service";

const anchorEventRepo = new AnchorEventRepository();

export type AnchorEventDemandCard = DemandCardSummary;

export const getAnchorEventDemandCards = async (
  eventId: AnchorEventId,
): Promise<AnchorEventDemandCard[]> => {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  return listDemandCardSummaries(eventId);
};
