import type { RouteLocationRaw } from "vue-router";
import type { HomeEventUnitKey } from "@/widgets/home/event-unit-config";

export interface HomeEventUnitViewModel {
  key: HomeEventUnitKey;
  eventId: number | null;
  analyticsIndex: number;
  isLead: boolean;
  joinedCount: number;
  activeSessionCount: number;
  remainingSlots: number | null;
  nearestStartAtLabel: string | null;
  startsSoon: boolean;
  kicker: string;
  title: string;
  description: string;
  ctaLabel: string;
  metaLabel: string | null;
  iconClass: string;
}

export const toEventDestination = (
  eventId: number | null,
): RouteLocationRaw => {
  if (eventId !== null) {
    return {
      name: "anchor-event" as const,
      params: {
        eventId,
      },
    };
  }

  return {
    name: "event-plaza" as const,
  };
};
