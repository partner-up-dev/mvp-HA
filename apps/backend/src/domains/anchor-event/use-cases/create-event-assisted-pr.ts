import { HTTPException } from "hono/http-exception";
import type { AnchorEventId, PartnerRequestFields } from "../../../entities";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPRAttachmentRepository } from "../../../repositories/AnchorEventPRAttachmentRepository";
import { createPRFromStructured } from "../../pr-core/use-cases/create-pr-structured";
import type { CreatorIdentityInput } from "../../pr/services";
import { isEventScopedLocation } from "../services/event-scope";
import { buildAnchorEventFormModeTimeWindow } from "../services/form-mode";

const anchorEventRepo = new AnchorEventRepository();
const attachmentRepo = new AnchorEventPRAttachmentRepository();

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

  await attachmentRepo.upsertByPrId({
    prId: result.id,
    anchorEventId: event.id,
  });

  return result;
}
