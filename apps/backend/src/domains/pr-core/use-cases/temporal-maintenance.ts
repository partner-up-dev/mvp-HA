import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { refreshTemporalStatus } from "../temporal-refresh";

const prRepo = new PartnerRequestRepository();

/**
 * Temporal maintenance tick — scans PRs in active lifecycle statuses
 * and refreshes their temporal state (expire, activate, release slots).
 */
export async function runTemporalMaintenanceTick(): Promise<{
  processed: number;
  failed: number;
}> {
  const candidates = await prRepo.findByStatuses([
    "OPEN",
    "READY",
    "FULL",
    "ACTIVE",
  ]);

  let failed = 0;
  for (const request of candidates) {
    try {
      await refreshTemporalStatus(request);
    } catch (error) {
      failed += 1;
      console.error("Temporal maintenance failed", {
        prId: request.id,
        error,
      });
    }
  }

  return { processed: candidates.length, failed };
}
