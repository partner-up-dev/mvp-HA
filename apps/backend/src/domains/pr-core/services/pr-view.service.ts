/**
 * PR view service — builds the public view of a PartnerRequest,
 * stripping internal fields and enriching with partner data.
 */

import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type { PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";

const partnerRepo = new PartnerRepository();

export type PublicPR = Omit<PartnerRequest, "pinHash" | "title"> & {
  title?: string;
  partners: number[];
  myPartnerId: number | null;
};

export async function toPublicPR(
  request: PartnerRequest,
  viewerUserId: UserId | null,
): Promise<PublicPR> {
  const partners = await partnerRepo.listActiveIdsByPrId(request.id);
  let myPartnerId: number | null = null;
  if (viewerUserId) {
    const slot = await partnerRepo.findActiveByPrIdAndUserId(
      request.id,
      viewerUserId,
    );
    myPartnerId = slot?.id ?? null;
  }

  const { pinHash, title, ...rest } = request;
  return {
    ...rest,
    title: title ?? undefined,
    partners,
    myPartnerId,
  };
}
