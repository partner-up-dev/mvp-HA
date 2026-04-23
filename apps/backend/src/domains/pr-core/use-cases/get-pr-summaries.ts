import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type {
  PRId,
  PartnerRequest,
  PartnerRequestSummary,
} from "../../../entities/partner-request";
import { toPublicStatus } from "../services/status-rules";
import { readPartnerRequestsByIds } from "../services/pr-read.service";

const partnerRepo = new PartnerRepository();

export async function buildPartnerRequestSummaries(
  rows: Array<PartnerRequest | null>,
): Promise<PartnerRequestSummary[]> {
  const filteredRows = rows.filter((row): row is NonNullable<typeof row> =>
    Boolean(row),
  );

  return Promise.all(
    filteredRows.map(async (row) => {
      const partners = await partnerRepo.listActiveIdsByPrId(row.id);
      return {
        id: row.id,
        canonicalPath: `/pr/${row.id}`,
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

export async function getPRSummariesByIds(
  ids: PRId[],
): Promise<PartnerRequestSummary[]> {
  const uniqueIds = Array.from(new Set(ids));
  const rows = await readPartnerRequestsByIds(uniqueIds, {
    consistency: "strong",
  });
  return buildPartnerRequestSummaries(rows);
}
