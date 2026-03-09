import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  AnchorEventStatus,
  LocationEntry,
} from "../../../entities";

const anchorEventRepo = new AnchorEventRepository();

export interface UpdateAdminAnchorEventInput {
  title: string;
  type: string;
  description: string | null;
  locationPool: LocationEntry[];
  coverImage: string | null;
  status: AnchorEventStatus;
}

export async function updateAdminAnchorEvent(
  eventId: AnchorEventId,
  input: UpdateAdminAnchorEventInput,
): Promise<AnchorEvent> {
  const updated = await anchorEventRepo.update(eventId, {
    title: input.title,
    type: input.type,
    description: input.description,
    locationPool: input.locationPool,
    coverImage: input.coverImage,
    status: input.status,
  });

  if (!updated) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  return updated;
}
