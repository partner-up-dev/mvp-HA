import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { updatePRStatus } from "../../pr-core";
import { HTTPException } from "hono/http-exception";
import type { PRId, PRStatusManual } from "../../../entities";

const anchorPRRepo = new AnchorPRRepository();

export async function updateAdminAnchorPRStatus(
  prId: PRId,
  status: PRStatusManual,
) {
  const record = await anchorPRRepo.findRecordByPrId(prId);
  if (!record || record.root.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  return await updatePRStatus(prId, status, null);
}
