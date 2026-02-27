import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type {
  PRId,
  PartnerRequestSummary,
} from "../../../entities/partner-request";
import { refreshTemporalStatus } from "../temporal-refresh";
import { toPublicStatus } from "../services/status-rules";

const prRepo = new PartnerRequestRepository();
const partnerRepo = new PartnerRepository();

export async function getPRSummariesByIds(
  ids: PRId[],
): Promise<PartnerRequestSummary[]> {
  const uniqueIds = Array.from(new Set(ids));
  const rows = await prRepo.findByIds(uniqueIds);
  const refreshedRows = await Promise.all(
    rows.map((row) => refreshTemporalStatus(row)),
  );

  return Promise.all(
    refreshedRows.map(async (row) => {
      const partners = await partnerRepo.listActiveIdsByPrId(row.id);
      return {
        id: row.id,
        status: toPublicStatus(row.status as string, row.time),
        minPartners: row.minPartners,
        maxPartners: row.maxPartners,
        partners,
        createdAt: row.createdAt.toISOString(),
        title: row.title ?? undefined,
        type: row.type,
      };
    }),
  );
}
