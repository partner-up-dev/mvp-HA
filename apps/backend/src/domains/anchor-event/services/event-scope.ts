import {
  normalizeLocationPool,
  type AnchorEvent,
} from "../../../entities/anchor-event";
import { isPublishedPoi } from "../../../entities/poi";
import { PoiRepository } from "../../../repositories/PoiRepository";

const poiRepo = new PoiRepository();

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
  const pois = await poiRepo.findByIds(locationPool, {
    includeUnpublished: true,
  });
  const poiById = new Map(pois.map((poi) => [poi.id, poi]));

  return locationPool.filter((location) => {
    const poi = poiById.get(location);
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
