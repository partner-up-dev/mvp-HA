import { HTTPException } from "hono/http-exception";
import type { PRId, UserId } from "../../../entities";
import { operationLogService } from "../../../infra/operation-log";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRSupportResourceRepository } from "../../../repositories/PRSupportResourceRepository";

const partnerRepo = new PartnerRepository();
const prRepo = new PartnerRequestRepository();
const prSupportRepo = new PRSupportResourceRepository();

export async function deleteAdminPR(input: {
  prId: PRId;
  actorUserId: UserId | null;
}) {
  const existing = await prRepo.findById(input.prId);
  if (!existing) {
    throw new HTTPException(404, { message: "PR not found" });
  }

  const [partnerCount, supportResourceCount] = await Promise.all([
    partnerRepo.countTotalByPrId(input.prId),
    prSupportRepo.countByPrId(input.prId),
  ]);

  const deleted = await prRepo.deleteById(input.prId);
  if (!deleted) {
    throw new HTTPException(500, { message: "Failed to delete PR" });
  }

  operationLogService.log({
    actorId: input.actorUserId,
    action: "pr.admin_delete",
    aggregateType: "partner_request",
    aggregateId: String(input.prId),
    detail: {
      title: existing.title,
      type: existing.type,
      location: existing.location,
      status: existing.status,
      partnerCount,
      supportResourceCount,
    },
  });

  return {
    ok: true as const,
    prId: input.prId,
    deletedPartnerCount: partnerCount,
    deletedSupportResourceCount: supportResourceCount,
  };
}
