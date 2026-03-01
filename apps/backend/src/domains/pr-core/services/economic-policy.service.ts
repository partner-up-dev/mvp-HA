import type {
  AnchorEvent,
  AnchorEventPaymentModel,
} from "../../../entities/anchor-event";
import type { AnchorEventBatch } from "../../../entities/anchor-event-batch";
import type {
  EconomicPolicyScope,
  PaymentModel,
  PartnerRequestFields,
} from "../../../entities/partner-request";
import { getTimeWindowStart } from "./time-window.service";

export interface ResolvedEconomicPolicy {
  paymentModelApplied: PaymentModel | null;
  discountRateApplied: number | null;
  subsidyCapApplied: number | null;
  cancellationPolicyApplied: string | null;
  resourceBookingDeadlineAt: Date | null;
  economicPolicyScopeApplied: EconomicPolicyScope | null;
  economicPolicyVersionApplied: number | null;
}

const BOOKING_DEADLINE_RULE_PATTERN = /^T-(\d+)([mhd])$/i;

function mapAnchorPaymentModelToPR(
  paymentModel: AnchorEventPaymentModel,
): PaymentModel {
  return paymentModel;
}

export function resolveBookingDeadlineAt(
  bookingDeadlineRule: string | null | undefined,
  timeWindow: PartnerRequestFields["time"],
): Date | null {
  if (!bookingDeadlineRule) return null;

  const trimmed = bookingDeadlineRule.trim();
  if (!trimmed) return null;

  const absolute = new Date(trimmed);
  if (!Number.isNaN(absolute.getTime())) {
    return absolute;
  }

  const start = getTimeWindowStart(timeWindow);
  if (!start) return null;

  const match = trimmed.match(BOOKING_DEADLINE_RULE_PATTERN);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = match[2].toLowerCase();
  if (!Number.isFinite(amount) || amount <= 0) return null;

  let offsetMs = 0;
  if (unit === "m") offsetMs = amount * 60 * 1000;
  if (unit === "h") offsetMs = amount * 60 * 60 * 1000;
  if (unit === "d") offsetMs = amount * 24 * 60 * 60 * 1000;
  if (offsetMs <= 0) return null;

  return new Date(start.getTime() - offsetMs);
}

export function resolveAnchorEconomicPolicy(
  event: AnchorEvent,
  batch: AnchorEventBatch | null,
  timeWindow: PartnerRequestFields["time"],
): ResolvedEconomicPolicy {
  const useBatchOverride =
    batch !== null &&
    (batch.discountRateOverride !== null || batch.subsidyCapOverride !== null);

  return {
    paymentModelApplied: mapAnchorPaymentModelToPR(event.paymentModel),
    discountRateApplied:
      batch?.discountRateOverride ?? event.discountRateDefault ?? null,
    subsidyCapApplied:
      batch?.subsidyCapOverride ?? event.subsidyCapDefault ?? null,
    cancellationPolicyApplied: event.cancellationPolicy ?? null,
    resourceBookingDeadlineAt: resolveBookingDeadlineAt(
      event.resourceBookingDeadlineRule,
      timeWindow,
    ),
    economicPolicyScopeApplied: useBatchOverride
      ? "BATCH_OVERRIDE"
      : "EVENT_DEFAULT",
    economicPolicyVersionApplied: batch?.economicPolicyVersion ?? 1,
  };
}

export function resolveCommunityEconomicPolicy(): ResolvedEconomicPolicy {
  return {
    paymentModelApplied: null,
    discountRateApplied: null,
    subsidyCapApplied: null,
    cancellationPolicyApplied: null,
    resourceBookingDeadlineAt: null,
    economicPolicyScopeApplied: null,
    economicPolicyVersionApplied: null,
  };
}

