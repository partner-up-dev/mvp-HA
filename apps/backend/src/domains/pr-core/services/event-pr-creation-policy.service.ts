import { HTTPException } from "hono/http-exception";
import type {
  AnchorEvent,
  AnchorEventId,
  AnchorEventPrCreationPolicy,
} from "../../../entities";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";

const anchorEventRepo = new AnchorEventRepository();

export const ANCHOR_EVENT_USER_PR_CREATION_DISABLED_CODE =
  "ANCHOR_EVENT_USER_PR_CREATION_DISABLED";

const throwUserCreationDisabled = (): never => {
  const error = new HTTPException(403, {
    message: "User PR creation is disabled for this anchor event type",
  });
  (
    error as HTTPException & {
      code?: typeof ANCHOR_EVENT_USER_PR_CREATION_DISABLED_CODE;
    }
  ).code = ANCHOR_EVENT_USER_PR_CREATION_DISABLED_CODE;
  throw error;
};

const isUserCreationDisabled = (
  policy: AnchorEventPrCreationPolicy,
): boolean => policy === "ADMIN_ONLY";

export const canUserCreatePRForAnchorEvent = (
  event: Pick<AnchorEvent, "prCreationPolicy">,
): boolean => !isUserCreationDisabled(event.prCreationPolicy);

export async function assertUserPRCreationAllowedForAnchorEvent(input: {
  anchorEventId?: AnchorEventId;
  type: string;
}): Promise<void> {
  const normalizedType = input.type.trim();
  if (normalizedType.length === 0) {
    return;
  }

  const event =
    input.anchorEventId !== undefined
      ? await anchorEventRepo.findById(input.anchorEventId)
      : await anchorEventRepo.findOneByType(normalizedType);
  if (!event) {
    return;
  }

  if (isUserCreationDisabled(event.prCreationPolicy)) {
    throwUserCreationDisabled();
  }
}
