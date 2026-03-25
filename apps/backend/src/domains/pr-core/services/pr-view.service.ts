/**
 * PR view service — builds the public view of a PartnerRequest,
 * stripping internal fields and enriching with partner data.
 */

import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { CommunityPRRepository } from "../../../repositories/CommunityPRRepository";
import type { PartnerRequest } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";

const partnerRepo = new PartnerRepository();
const communityPRRepo = new CommunityPRRepository();

export type PublicPR = Omit<PartnerRequest, "title"> & {
  title?: string;
  partners: number[];
  myPartnerId: number | null;
  isViewerReleased: boolean;
  rawText: string | null;
  budget: string | null;
};

export async function toPublicPR(
  request: PartnerRequest,
  viewerUserId: UserId | null,
): Promise<PublicPR> {
  const partners = await partnerRepo.listActiveIdsByPrId(request.id);
  let myPartnerId: number | null = null;
  let isViewerReleased = false;
  if (viewerUserId) {
    const slot = await partnerRepo.findActiveByPrIdAndUserId(
      request.id,
      viewerUserId,
    );
    myPartnerId = slot?.id ?? null;
    if (myPartnerId === null) {
      const releasedSlot = await partnerRepo.findReleasedByPrIdAndUserId(
        request.id,
        viewerUserId,
      );
      isViewerReleased = releasedSlot !== null;
    }
  }

  const { title, ...rest } = request;
  let rawText: string | null = null;
  let budget: string | null = null;
  if (request.prKind === "COMMUNITY") {
    const community = await communityPRRepo.findByPrId(request.id);
    rawText = community?.rawText ?? null;
    budget = community?.budget ?? null;
  }

  return {
    ...rest,
    title: title ?? undefined,
    partners,
    myPartnerId,
    isViewerReleased,
    rawText,
    budget,
  };
}
