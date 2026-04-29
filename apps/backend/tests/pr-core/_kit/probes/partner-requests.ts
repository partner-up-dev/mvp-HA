import { eq } from "drizzle-orm";
import { getTestDb } from "../../../_infra/probes/sql-probe";
import {
  partnerRequests,
  type PRId,
  type PRStatus,
} from "../../../../src/entities/partner-request";

export async function probePartnerRequestStatus(
  prId: PRId,
): Promise<PRStatus> {
  const rows = await getTestDb()
    .select({ status: partnerRequests.status })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, prId));
  const status = rows[0]?.status ?? null;
  if (!status) {
    throw new Error(`PartnerRequest ${prId} not found while probing status`);
  }
  return status;
}
