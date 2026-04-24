import { AnchorEventPRContextRepository } from "../../../repositories/AnchorEventPRContextRepository";
import { updatePRStatus } from "../../pr";
import { HTTPException } from "hono/http-exception";
import type { PRId, PRStatusManual } from "../../../entities";

const eventContextRepo = new AnchorEventPRContextRepository();

export async function updateAdminPRStatus(
  prId: PRId,
  status: PRStatusManual,
) {
  const record = await eventContextRepo.findRecordByPrId(prId);
  if (!record) {
    throw new HTTPException(404, { message: "PR not found" });
  }

  return await updatePRStatus(prId, status, null);
}
