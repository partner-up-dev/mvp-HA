import { HTTPException } from "hono/http-exception";
import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import type { PRId, VisibilityStatus } from "../../../entities";

const eventContextRepo = new AnchorEventPRContextRepository();

export async function updateAdminPRVisibility(
  prId: PRId,
  visibilityStatus: VisibilityStatus,
): Promise<void> {
  const record = await eventContextRepo.findRecordByPrId(prId);
  if (!record) {
    throw new HTTPException(404, { message: "PR not found" });
  }

  await eventContextRepo.updateVisibilityStatus(prId, visibilityStatus);
}
