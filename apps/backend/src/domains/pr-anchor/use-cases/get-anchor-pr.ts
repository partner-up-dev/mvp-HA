import { HTTPException } from "hono/http-exception";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId, PRStatus } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../../pr-core/services/user-resolver.service";
import { toPublicPR } from "../../pr-core/services/pr-view.service";
import { refreshTemporalStatus } from "../../pr-core/temporal-refresh";
import { recommendAlternativeBatches } from "../../pr-core/use-cases/recommend-alternative-batches";
import type { AlternativeBatchRecommendation } from "../../pr-core/use-cases/recommend-alternative-batches";

const prRepo = new PartnerRequestRepository();
const anchorPRRepo = new AnchorPRRepository();

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
    economyPreview: {
      resourceBookingDeadlineAt: string | null;
      paymentModelApplied: "A" | "C" | null;
      discountRateApplied: number | null;
      subsidyCapApplied: number | null;
      cancellationPolicyApplied: string | null;
      economicPolicyScopeApplied: "EVENT_DEFAULT" | "BATCH_OVERRIDE" | null;
      economicPolicyVersionApplied: number | null;
    };
    related: {
      sameBatchAlternatives: SameBatchAlternative[];
      alternativeBatches: AlternativeBatchRecommendation[];
    };
  };
};

const hasVisibleSameBatchStatus = (status: PRStatus): boolean =>
  status !== "FULL" && status !== "EXPIRED" && status !== "CLOSED";

export async function getAnchorPRDetail(
  id: PRId,
  viewerOpenId?: string | null,
): Promise<AnchorPRDetail> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (request.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  const refreshed = await refreshTemporalStatus(request);
  const viewerUserId = viewerOpenId
    ? (await resolveUserByOpenId(viewerOpenId)).id
    : null;
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
      economyPreview: {
        resourceBookingDeadlineAt: toIsoString(anchor.resourceBookingDeadlineAt),
        paymentModelApplied: anchor.paymentModelApplied,
        discountRateApplied: anchor.discountRateApplied,
        subsidyCapApplied: anchor.subsidyCapApplied,
        cancellationPolicyApplied: anchor.cancellationPolicyApplied,
        economicPolicyScopeApplied: anchor.economicPolicyScopeApplied,
        economicPolicyVersionApplied: anchor.economicPolicyVersionApplied,
      },
      related: {
        sameBatchAlternatives,
        alternativeBatches,
      },
    },
  };
}
