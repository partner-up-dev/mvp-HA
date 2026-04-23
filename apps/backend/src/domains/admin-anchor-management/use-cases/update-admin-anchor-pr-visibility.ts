import { HTTPException } from "hono/http-exception";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import type { PRId, VisibilityStatus } from "../../../entities";

const anchorPRRepo = new AnchorPRRepository();

export async function updateAdminAnchorPRVisibility(
  prId: PRId,
  visibilityStatus: VisibilityStatus,
): Promise<void> {
  const record = await anchorPRRepo.findRecordByPrId(prId);
  if (!record) {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  await anchorPRRepo.updateVisibilityStatus(prId, visibilityStatus);
}
