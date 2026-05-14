import {
  normalizeLocationPool,
  type AnchorEvent,
} from "../../../entities/anchor-event";
import { isPublishedPoi } from "../../../entities/poi";
import { findPoisByNames } from "../../poi";

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

export const resolvePublicEventLocationPool = async (
  event: AnchorEvent,
): Promise<string[]> => {
  const locationPool = normalizeLocationPool(event.locationPool);
  const pois = await findPoisByNames(locationPool, {
    includeUnpublished: true,
  });
  const poiByName = new Map(pois.map((poi) => [poi.name, poi]));

  return locationPool.filter((location) => {
    const poi = poiByName.get(location);
    return !poi || isPublishedPoi(poi);
  });
};

export const isPublicEventScopedLocation = async (
  event: AnchorEvent,
  location: string | null,
): Promise<boolean> => {
  const normalized = location?.trim() ?? "";
  if (!normalized) {
    return false;
  }

  const publicLocationPool = await resolvePublicEventLocationPool(event);
  return publicLocationPool.includes(normalized);
};
