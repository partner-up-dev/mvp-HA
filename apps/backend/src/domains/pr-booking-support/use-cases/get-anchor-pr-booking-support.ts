import { HTTPException } from "hono/http-exception";
import type { PRStatus } from "../../../entities";
import { AnchorPRSupportResourceRepository } from "../../../repositories/AnchorPRSupportResourceRepository";
import { buildBookingSupportPreview } from "../services/build-booking-support-preview";
import type {
  BookingHandledBy,
  PRId,
  SupportResourceKind,
  SupportSettlementMode,
} from "../../../entities";
import type { UserId } from "../../../entities/user";
import { resolveBookingContactState } from "../services/resolve-booking-contact-state";
import { readPartnerRequestById } from "../../pr/services";

const prSupportRepo = new AnchorPRSupportResourceRepository();

export interface PRBookingSupportDetail {
  prId: number;
  status: PRStatus;
  bookingSupport: {
    overview: {
      title: string;
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

export async function getPRBookingSupport(
  id: PRId,
  viewerUserId: UserId | null = null,
): Promise<PRBookingSupportDetail> {
  const root = await readPartnerRequestById(id, {
    consistency: "strong",
  });
  if (!root) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }

  const resources = await prSupportRepo.findByPrId(id);
  if (resources.length === 0) {
    throw new HTTPException(404, {
      message: "Booking support is not configured for this partner request",
    });
  }
  const overview = buildBookingSupportPreview(resources);
  const bookingContact = await resolveBookingContactState({
    prId: id,
    viewerUserId,
    supportResources: resources,
  });

  return {
    prId: id,
    status: root.status,
    bookingSupport: {
      overview: {
        title: "预订与资助",
        headline: overview.headline,
        highlights: overview.highlights,
        effectiveBookingDeadlineAt: overview.effectiveBookingDeadlineAt,
      },
      bookingContact,
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
