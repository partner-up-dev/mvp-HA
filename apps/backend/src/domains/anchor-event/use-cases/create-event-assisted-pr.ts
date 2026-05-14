import { throwHttpProblem } from "../../../lib/problem-details";
import type { AnchorEventId, PartnerRequestFields } from "../../../entities";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { createPRFromStructured } from "../../pr-core/use-cases/create-pr-structured";
import {
  type CreatorIdentityInput,
} from "../../pr/services";
import { isPublicEventScopedLocation } from "../services/event-scope";
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
    return throwHttpProblem({
      status: 404,
      detail: "Anchor event not found",
      code: "ANCHOR_EVENT_NOT_FOUND",
    });
  }

  if (input.fields.type.trim() !== event.type) {
    return throwHttpProblem({ status: 400, detail: "Selected type does not match the anchor event type" });
  }

  if (!(await isPublicEventScopedLocation(event, input.fields.location))) {
    return throwHttpProblem({ status: 400, detail: "Selected location is outside the anchor event scope" });
  }

  const [startAt] = input.fields.time;
  if (!startAt) {
    return throwHttpProblem({ status: 400, detail: "Missing start time" });
  }

  const validatedTimeWindow = buildAnchorEventFormModeTimeWindow(event, startAt);
  if (!eventOwnsTimeWindow(event, validatedTimeWindow)) {
    return throwHttpProblem({ status: 400, detail: "Selected time window is outside the anchor event time pool" });
  }

  const result = await createPRFromStructured(
    {
      ...input.fields,
      time: validatedTimeWindow,
    },
    input.creatorIdentity,
    {
      anchorEventId: event.id,
      createSource: "EVENT_ASSISTED",
    },
  );

  return result;
}
