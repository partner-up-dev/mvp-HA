import { HTTPException } from "hono/http-exception";
import type { PRStatus } from "../../../entities";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import { buildBookingSupportPreview } from "../services/build-booking-support-preview";
import type {
  BookingHandledBy,
  PRId,
  SupportResourceKind,
  SupportSettlementMode,
} from "../../../entities";

const prRepo = new PartnerRequestRepository();
const anchorPRRepo = new AnchorPRRepository();
const prSupportRepo = new AnchorPRSupportResourceRepository();

export interface AnchorPRBookingSupportDetail {
  prId: number;
  status: PRStatus;
  anchorEventId: number;
  batchId: number;
  bookingSupport: {
    overview: {
      title: string;
      headline: string | null;
      highlights: string[];
      effectiveBookingDeadlineAt: string | null;
    };
    resources: Array<{
      id: number;
      title: string;
      resourceKind: SupportResourceKind;
      summaryText: string;
      detailRules: string[];
      booking: {
        required: boolean;
        handledBy: BookingHandledBy | null;
        deadlineAt: string | null;
        locksParticipant: boolean;
        cancellationPolicy: string | null;
      };
      support: {
        settlementMode: SupportSettlementMode;
        subsidyRate: number | null;
        subsidyCap: number | null;
        requiresUserTransferToPlatform: boolean;
      };
    }>;
  };
}

export async function getAnchorPRBookingSupport(
  id: PRId,
): Promise<AnchorPRBookingSupportDetail> {
  const root = await prRepo.findById(id);
  if (!root || root.prKind !== "ANCHOR") {
    throw new HTTPException(404, { message: "Anchor PR not found" });
  }

  const anchor = await anchorPRRepo.findByPrId(id);
  if (!anchor) {
    throw new HTTPException(500, {
      message: "Anchor PR subtype row missing",
    });
  }

  const resources = await prSupportRepo.findByPrId(id);
  const overview = buildBookingSupportPreview(resources);

  return {
    prId: id,
    status: root.status,
    anchorEventId: anchor.anchorEventId,
    batchId: anchor.batchId,
    bookingSupport: {
      overview: {
        title: "预订与资助",
        headline: overview.headline,
        highlights: overview.highlights,
        effectiveBookingDeadlineAt: overview.effectiveBookingDeadlineAt,
      },
      resources: resources.map((resource) => ({
        id: resource.id,
        title: resource.title,
        resourceKind: resource.resourceKind,
        summaryText: resource.summaryText,
        detailRules: [...resource.detailRules],
        booking: {
          required: resource.bookingRequired,
          handledBy: resource.bookingHandledBy ?? null,
          deadlineAt: resource.bookingDeadlineAt?.toISOString() ?? null,
          locksParticipant: resource.bookingLocksParticipant,
          cancellationPolicy: resource.cancellationPolicy ?? null,
        },
        support: {
          settlementMode: resource.settlementMode,
          subsidyRate: resource.subsidyRate ?? null,
          subsidyCap: resource.subsidyCap ?? null,
          requiresUserTransferToPlatform:
            resource.requiresUserTransferToPlatform,
        },
      })),
    },
  };
}
