import type {
  PRSupportResource,
  BookingHandledBy,
} from "../../../entities";
import type { PRStatus } from "../../../entities/partner-request";

export const BOOKING_EXECUTION_PENDING_STATUSES = [
  "READY",
  "FULL",
  "LOCKED_TO_START",
] as const satisfies PRStatus[];

export const isPlatformHandledBooking = (
  handledBy: BookingHandledBy | null | undefined,
): boolean =>
  handledBy === "PLATFORM" || handledBy === "PLATFORM_PASSTHROUGH";

export const isBookingExecutionPendingStatus = (
  status: PRStatus | string,
): boolean =>
  BOOKING_EXECUTION_PENDING_STATUSES.includes(
    status as (typeof BOOKING_EXECUTION_PENDING_STATUSES)[number],
  );

export const requiresBookingContactForHandledBy = (
  handledBy: BookingHandledBy | null | undefined,
): boolean => handledBy === "PLATFORM_PASSTHROUGH";

export const isPlatformHandledBookingResource = (
  resource: Pick<PRSupportResource, "bookingRequired" | "bookingHandledBy">,
): boolean =>
  resource.bookingRequired && isPlatformHandledBooking(resource.bookingHandledBy);
