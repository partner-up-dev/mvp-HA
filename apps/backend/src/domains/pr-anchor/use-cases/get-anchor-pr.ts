import { HTTPException } from "hono/http-exception";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type { PRId, PRStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { resolveUserByOpenId } from "../../pr-core/services/user-resolver.service";
import { toPublicPR } from "../../pr-core/services/pr-view.service";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import {
  buildBookingSupportPreview,
  getEffectiveBookingDeadline,
} from "../../pr-booking-support";
import {
  buildAnchorPartnerSection,
  type PartnerSectionView,
} from "../../pr-core/services/partner-section-view.service";
import { resolveAnchorParticipationPolicy } from "../../pr-core/services/anchor-participation-policy.service";
import { resolveBookingContactState } from "../../pr-booking-support";
import { readPartnerRequestById } from "../../pr-core/services/pr-read.service";
import {
  buildPRCanonicalShareMetadata,
  type PRCanonicalShareMetadata,
} from "../../pr-core/services/pr-share-metadata.service";

const anchorPRRepo = new AnchorPRRepository();
const prSupportRepo = new AnchorPRSupportResourceRepository();
const partnerRepo = new PartnerRepository();

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export type AnchorPRDetail = {
  id: number;
  prKind: "ANCHOR";
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
  anchor: {
    anchorEventId: number;
    batchId: number;
    visibilityStatus: "VISIBLE" | "HIDDEN";
    autoHideAt: string | null;
    attendance: {
      supportsConfirm: true;
      supportsCheckIn: true;
    };
    bookingSupportPreview: {
      headline: string | null;
      highlights: string[];
      effectiveBookingDeadlineAt: string | null;
    };
    bookingContact: {
      required: boolean;
      state: "NOT_REQUIRED" | "MISSING" | "VERIFIED";
      ownerPartnerId: number | null;
      ownerIsCurrentViewer: boolean;
      maskedPhone: string | null;
      verifiedAt: string | null;
      deadlineAt: string | null;
    };
    related: {
      sameBatchAlternatives: Array<{
        id: number;
        location: string;
        status: PRStatus;
      }>;
      alternativeBatches: Array<{
        location: string;
        timeWindow: [string | null, string | null];
      }>;
    };
  };
  partnerSection: PartnerSectionView;
};

export async function getAnchorPRDetail(
  id: PRId,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
  },
): Promise<AnchorPRDetail> {
  const request = await readPartnerRequestById(id, {
    consistency: "strong",
  });
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (request.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  const viewerOpenId = viewerIdentity?.openId?.trim() ?? null;
  const viewerUserId =
    viewerOpenId && viewerOpenId.length > 0
      ? (await resolveUserByOpenId(viewerOpenId)).id
      : viewerIdentity?.userId ?? null;
  const publicPR = await toPublicPR(request, viewerUserId);
  const canonicalShare = buildPRCanonicalShareMetadata(publicPR);
  const anchor = await anchorPRRepo.findByPrId(id);
  if (!anchor) {
    throw new HTTPException(500, {
      message: "Anchor PR subtype row missing",
    });
  }

  const supportRows = await prSupportRepo.findByPrId(id);
  const bookingSupportPreview = buildBookingSupportPreview(supportRows);
  const bookingDeadlineAt = await getEffectiveBookingDeadline(id);
  const bookingContact = await resolveBookingContactState({
    prId: id,
    viewerUserId,
    supportResources: supportRows,
    effectiveBookingDeadlineAt: bookingDeadlineAt,
  });
  const policy = resolveAnchorParticipationPolicy(anchor, request.time);
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    id,
  );
  const rosterParticipants = await partnerRepo.listRosterParticipantSummariesByPrId(
    id,
  );
  return {
    id: publicPR.id,
    prKind: "ANCHOR",
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
    anchor: {
      anchorEventId: anchor.anchorEventId,
      batchId: anchor.batchId,
      visibilityStatus: anchor.visibilityStatus,
      autoHideAt: toIsoString(anchor.autoHideAt),
      attendance: {
        supportsConfirm: true,
        supportsCheckIn: true,
      },
      bookingSupportPreview: {
        headline: bookingSupportPreview.headline,
        highlights: bookingSupportPreview.highlights,
        effectiveBookingDeadlineAt:
          bookingSupportPreview.effectiveBookingDeadlineAt,
      },
      bookingContact,
      related: {
        sameBatchAlternatives: [],
        alternativeBatches: [],
      },
    },
    partnerSection: buildAnchorPartnerSection({
      publicPR,
      activeParticipants,
      rosterParticipants,
      viewerUserId,
      policy,
      bookingDeadlineAt,
      bookingContact,
      sameBatchAlternatives: [],
      alternativeBatches: [],
    }),
  };
}
