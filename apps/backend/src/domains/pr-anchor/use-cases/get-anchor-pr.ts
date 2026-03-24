import { HTTPException } from "hono/http-exception";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId, PRStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { resolveUserByOpenId } from "../../pr-core/services/user-resolver.service";
import { toPublicPR } from "../../pr-core/services/pr-view.service";
import { refreshTemporalStatus } from "../../pr-core/temporal-refresh";
import { recommendAlternativeBatches } from "../../pr-core/use-cases/recommend-alternative-batches";
import type { AlternativeBatchRecommendation } from "../../pr-core/use-cases/recommend-alternative-batches";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import {
  buildBookingSupportPreview,
  getEffectiveBookingDeadline,
} from "../../pr-booking-support";
import {
  buildAnchorPartnerSection,
  type PartnerSectionReleaseState,
  type PartnerSectionView,
} from "../../pr-core/services/partner-section-view.service";
import { resolveAnchorParticipationPolicy } from "../../pr-core/services/anchor-participation-policy.service";
import { resolveBookingContactState } from "../../pr-booking-support";
import { OperationLogRepository } from "../../../infra/operation-log/operation-log.repository";

const prRepo = new PartnerRequestRepository();
const anchorPRRepo = new AnchorPRRepository();
const prSupportRepo = new AnchorPRSupportResourceRepository();
const partnerRepo = new PartnerRepository();
const operationLogRepo = new OperationLogRepository();

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

type SameBatchAlternative = {
  id: number;
  location: string;
  status: PRStatus;
};

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
      sameBatchAlternatives: SameBatchAlternative[];
      alternativeBatches: AlternativeBatchRecommendation[];
    };
  };
  partnerSection: PartnerSectionView;
};

const hasVisibleSameBatchStatus = (status: PRStatus): boolean =>
  status !== "FULL" && status !== "EXPIRED" && status !== "CLOSED";

const releaseActionStateMap = new Map<string, PartnerSectionReleaseState>([
  ["partner.auto_release_unconfirmed", "RELEASED"],
]);
// Ensure we fetch enough recent logs to cover release actions on larger rosters.
const minReleaseLogLimit = 50;

const resolveReleaseStateByPartnerId = async (
  prId: PRId,
  rosterParticipants: Awaited<
    ReturnType<typeof partnerRepo.listRosterParticipantSummariesByPrId>
  >,
): Promise<Map<number, PartnerSectionReleaseState>> => {
  const hasReleased = rosterParticipants.some(
    (participant) => participant.status === "RELEASED",
  );
  if (!hasReleased) return new Map();

  const logs = await operationLogRepo.findByAggregate(
    "partner_request",
    String(prId),
    Math.max(minReleaseLogLimit, rosterParticipants.length * 2),
  );
  const releaseStateByPartnerId = new Map<number, PartnerSectionReleaseState>();

  for (const log of logs) {
    const state = releaseActionStateMap.get(log.action);
    if (!state) continue;
    const detail = log.detail as Record<string, unknown> | null;
    const rawPartnerId = detail?.partnerId;
    const partnerId =
      typeof rawPartnerId === "number"
        ? rawPartnerId
        : typeof rawPartnerId === "string"
          ? Number(rawPartnerId)
          : null;
    if (!partnerId || Number.isNaN(partnerId)) continue;
    if (releaseStateByPartnerId.has(partnerId)) continue;
    releaseStateByPartnerId.set(partnerId, state);
  }

  return releaseStateByPartnerId;
};

export async function getAnchorPRDetail(
  id: PRId,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
  },
): Promise<AnchorPRDetail> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (request.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  const refreshed = await refreshTemporalStatus(request);
  const viewerOpenId = viewerIdentity?.openId?.trim() ?? null;
  const viewerUserId =
    viewerOpenId && viewerOpenId.length > 0
      ? (await resolveUserByOpenId(viewerOpenId)).id
      : viewerIdentity?.userId ?? null;
  const publicPR = await toPublicPR(refreshed, viewerUserId);
  const anchor = await anchorPRRepo.findByPrId(id);
  if (!anchor) {
    throw new HTTPException(500, {
      message: "Anchor PR subtype row missing",
    });
  }

  const sameBatchAlternatives: SameBatchAlternative[] = [];
  if (publicPR.status === "FULL") {
    const sameBatchRecords = await anchorPRRepo.findVisibleByBatchId(anchor.batchId);
    for (const record of sameBatchRecords) {
      if (record.root.id === publicPR.id) continue;
      const location = record.root.location?.trim();
      if (!location || !hasVisibleSameBatchStatus(record.root.status)) continue;
      sameBatchAlternatives.push({
        id: record.root.id,
        location,
        status: record.root.status,
      });
    }
  }

  const alternativeBatches =
    publicPR.status === "FULL"
      ? (await recommendAlternativeBatches(id)).recommendations
      : [];
  const supportRows = await prSupportRepo.findByPrId(id);
  const bookingSupportPreview = buildBookingSupportPreview(supportRows);
  const bookingDeadlineAt = await getEffectiveBookingDeadline(id);
  const bookingContact = await resolveBookingContactState({
    prId: id,
    viewerUserId,
    supportResources: supportRows,
    effectiveBookingDeadlineAt: bookingDeadlineAt,
  });
  const policy = resolveAnchorParticipationPolicy(anchor, refreshed.time);
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    id,
  );
  const rosterParticipants = await partnerRepo.listRosterParticipantSummariesByPrId(
    id,
  );
  const releaseStateByPartnerId = await resolveReleaseStateByPartnerId(
    id,
    rosterParticipants,
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
        sameBatchAlternatives,
        alternativeBatches,
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
      sameBatchAlternatives,
      alternativeBatches,
      releaseStateByPartnerId,
    }),
  };
}
