import type { PRId } from "../../../entities/partner-request";

export async function syncAnchorBookingTriggeredState(
  _prId: PRId,
): Promise<void> {
  // Booking execution state is owned by booking-support resources and
  // execution records. PR root no longer persists a booking-triggered marker.
}
