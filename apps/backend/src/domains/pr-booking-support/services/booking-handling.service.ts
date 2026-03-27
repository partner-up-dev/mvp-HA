import type {
  AnchorPRSupportResource,
  BookingHandledBy,
} from "../../../entities";

export const isPlatformHandledBooking = (
  handledBy: BookingHandledBy | null | undefined,
): boolean =>
  handledBy === "PLATFORM" || handledBy === "PLATFORM_PASSTHROUGH";

export const requiresBookingContactForHandledBy = (
  handledBy: BookingHandledBy | null | undefined,
): boolean => handledBy === "PLATFORM_PASSTHROUGH";

export const isPlatformHandledBookingResource = (
  resource: Pick<AnchorPRSupportResource, "bookingRequired" | "bookingHandledBy">,
): boolean =>
  resource.bookingRequired && isPlatformHandledBooking(resource.bookingHandledBy);
