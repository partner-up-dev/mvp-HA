import {
  normalizeSystemLocationPool,
  normalizeUserLocationPool,
  type AnchorEvent,
} from "../../../entities/anchor-event";
import type { AnchorLocationSource } from "../../../entities/anchor-partner-request";

export const isEventScopedLocation = (
  event: AnchorEvent,
  location: string | null,
): boolean => {
  const normalized = location?.trim() ?? "";
  if (!normalized) {
    return false;
  }

  const systemLocationPool = normalizeSystemLocationPool(event.systemLocationPool);
  if (systemLocationPool.includes(normalized)) {
    return true;
  }

  const userLocationPool = normalizeUserLocationPool(event.userLocationPool);
  return userLocationPool.some((entry) => entry.id === normalized);
};

export const resolveEventLocationSource = (
  event: AnchorEvent,
  location: string | null,
): AnchorLocationSource | null => {
  const normalized = location?.trim() ?? "";
  if (!normalized) {
    return null;
  }

  const userLocationPool = normalizeUserLocationPool(event.userLocationPool);
  if (userLocationPool.some((entry) => entry.id === normalized)) {
    return "USER";
  }

  const systemLocationPool = normalizeSystemLocationPool(event.systemLocationPool);
  if (systemLocationPool.includes(normalized)) {
    return "SYSTEM";
  }

  return null;
};
