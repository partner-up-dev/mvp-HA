import {
  normalizeLocationPool,
  type AnchorEvent,
} from "../../../entities/anchor-event";

export const isEventScopedLocation = (
  event: AnchorEvent,
  location: string | null,
): boolean => {
  const normalized = location?.trim() ?? "";
  if (!normalized) {
    return false;
  }

  return normalizeLocationPool(event.locationPool).includes(normalized);
};
