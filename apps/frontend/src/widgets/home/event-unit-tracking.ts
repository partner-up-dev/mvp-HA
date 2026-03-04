import { trackEvent } from "@/shared/analytics/track";
import type { HomeEventUnitViewModel } from "@/widgets/home/home-event-units";

export const trackHomeEventUnitClick = (
  unit: HomeEventUnitViewModel,
): void => {
  trackEvent("home_event_card_click", {
    unitKey: unit.key,
    isLead: unit.isLead,
    remainingSlots: unit.remainingSlots,
    startsSoon: unit.startsSoon,
    eventId: unit.eventId ?? undefined,
  });

  if (unit.eventId === null) {
    return;
  }

  trackEvent("home_event_highlight_click", {
    eventId: unit.eventId,
    index: unit.analyticsIndex,
  });
};
