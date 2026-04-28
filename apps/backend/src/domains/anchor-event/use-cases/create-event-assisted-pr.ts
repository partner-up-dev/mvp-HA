import { HTTPException } from "hono/http-exception";
import type { AnchorEventId, PartnerRequestFields } from "../../../entities";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { createPRFromStructured } from "../../pr-core/use-cases/create-pr-structured";
import type { CreatorIdentityInput } from "../../pr/services";
import { isEventScopedLocation } from "../services/event-scope";
import { buildAnchorEventFormModeTimeWindow } from "../services/form-mode";
import { eventOwnsTimeWindow } from "../services/time-window-pool";

const anchorEventRepo = new AnchorEventRepository();

export async function createEventAssistedPR(
  input: {
    anchorEventId: AnchorEventId;
    fields: PartnerRequestFields;
    creatorIdentity: CreatorIdentityInput;
  },
) {
  const event = await anchorEventRepo.findById(input.anchorEventId);
  if (!event) {
    const error = new HTTPException(404, { message: "Anchor event not found" });
    (error as HTTPException & { code?: string }).code = "ANCHOR_EVENT_NOT_FOUND";
    throw error;
  }

  if (input.fields.type.trim() !== event.type) {
    throw new HTTPException(400, {
      message: "Selected type does not match the anchor event type",
    });
  }

  if (!isEventScopedLocation(event, input.fields.location)) {
    throw new HTTPException(400, {
      message: "Selected location is outside the anchor event scope",
    });
  }

  const [startAt] = input.fields.time;
  if (!startAt) {
    throw new HTTPException(400, { message: "Missing start time" });
  }

  const validatedTimeWindow = buildAnchorEventFormModeTimeWindow(event, startAt);
  if (!eventOwnsTimeWindow(event, validatedTimeWindow)) {
    throw new HTTPException(400, {
      message: "Selected time window is outside the anchor event time pool",
    });
  }

  const result = await createPRFromStructured(
    {
      ...input.fields,
      time: validatedTimeWindow,
    },
    input.creatorIdentity,
    {
      createSource: "EVENT_ASSISTED",
    },
  );

  return result;
}
