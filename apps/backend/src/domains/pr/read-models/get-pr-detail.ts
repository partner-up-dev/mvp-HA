import { HTTPException } from "hono/http-exception";
import type { PRStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { resolveUserByOpenId } from "../../user";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import {
  buildBookingSupportPreview,
  getEffectiveBookingDeadline,
  resolveBookingContactState,
} from "../../pr-booking-support";
import {
  buildPRPartnerSection,
  type PartnerSectionView,
} from "../../pr-core/services/partner-section-view.service";
import {
  hasAnchorParticipationPolicy,
  resolveAnchorParticipationPolicy,
} from "../../pr-core/services/anchor-participation-policy.service";
import { readPartnerRequestById } from "../../pr-core/services/pr-read.service";
import {
  buildPRCanonicalShareMetadata,
  type PRCanonicalShareMetadata,
} from "../sharing/pr-share-metadata.service";
import { toPublicPR } from "./public-pr-view.service";

const prSupportRepo = new AnchorPRSupportResourceRepository();
const partnerRepo = new PartnerRepository();

export type PRDetail = {
  id: number;
  title?: string;
  status: PRStatus;
  createdAt: string;
  createdBy?: string | null;
  core: {
    type: string;
    time: [string | null, string | null];
    location: string | null;
    minPartners: number | null;
    maxPartners: number | null;
    partners: number[];
    myPartnerId: number | null;
    budget: string | null;
    preferences: string[];
    notes: string | null;
  };
  share: {
    canonical: PRCanonicalShareMetadata;
    xiaohongshuPoster?: {
      caption: string;
      posterStylePrompt: string;
      posterUrl: string;
      createdAt: string;
    } | null;
    wechatThumbnail?: {
      style: number;
      posterUrl: string;
      createdAt: string;
    } | null;
  };
  bookingSupport: {
    available: boolean;
    overview: {
      headline: string | null;
      highlights: string[];
      effectiveBookingDeadlineAt: string | null;
    };
  };
  partnerSection: PartnerSectionView;
};

export async function getPRDetailView(
  id: number,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
  },
): Promise<PRDetail> {
  const request = await readPartnerRequestById(id, {
    consistency: "strong",
  });
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const viewerOpenId = viewerIdentity?.openId?.trim() ?? null;
  const viewerUserId =
    viewerOpenId && viewerOpenId.length > 0
      ? (await resolveUserByOpenId(viewerOpenId)).id
      : viewerIdentity?.userId ?? null;

  const publicPR = await toPublicPR(request, viewerUserId);
  const canonicalShare = buildPRCanonicalShareMetadata(publicPR);
  const supportResources = await prSupportRepo.findByPrId(id);
  const bookingSupportPreview = buildBookingSupportPreview(supportResources);
  const bookingDeadlineAt = await getEffectiveBookingDeadline(id);
  const bookingContact = await resolveBookingContactState({
    prId: id,
    viewerUserId,
    supportResources,
    effectiveBookingDeadlineAt: bookingDeadlineAt,
  });
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    id,
  );
  const rosterParticipants = await partnerRepo.listRosterParticipantSummariesByPrId(
    id,
  );
  const policy = hasAnchorParticipationPolicy(request)
    ? resolveAnchorParticipationPolicy(request, request.time)
    : null;

  return {
    id: publicPR.id,
    title: publicPR.title,
    status: publicPR.status,
    createdAt: publicPR.createdAt.toISOString(),
    createdBy: publicPR.createdBy ?? undefined,
    core: {
      type: publicPR.type,
      time: publicPR.time,
      location: publicPR.location,
      minPartners: publicPR.minPartners,
      maxPartners: publicPR.maxPartners,
      partners: publicPR.partners,
      myPartnerId: publicPR.myPartnerId,
      budget: publicPR.budget,
      preferences: publicPR.preferences,
      notes: publicPR.notes,
    },
    share: {
      canonical: canonicalShare,
      xiaohongshuPoster: publicPR.xiaohongshuPoster
        ? {
            ...publicPR.xiaohongshuPoster,
            createdAt: publicPR.xiaohongshuPoster.createdAt,
          }
        : null,
      wechatThumbnail: publicPR.wechatThumbnail
        ? {
            ...publicPR.wechatThumbnail,
            createdAt: publicPR.wechatThumbnail.createdAt,
          }
        : null,
    },
    bookingSupport: {
      available: supportResources.length > 0,
      overview: {
        headline: bookingSupportPreview.headline,
        highlights: bookingSupportPreview.highlights,
        effectiveBookingDeadlineAt:
          bookingSupportPreview.effectiveBookingDeadlineAt,
      },
    },
    partnerSection: buildPRPartnerSection({
      publicPR,
      activeParticipants,
      rosterParticipants,
      viewerUserId,
      policy,
      bookingDeadlineAt,
      bookingContact,
    }),
  };
}
