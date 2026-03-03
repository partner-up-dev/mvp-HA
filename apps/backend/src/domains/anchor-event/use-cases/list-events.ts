/**
 * Use-case: List all active Anchor Events for the Event Plaza.
 */

import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type { AnchorEvent } from "../../../entities/anchor-event";
import { PoiRepository } from "../../../repositories/PoiRepository";

const repo = new AnchorEventRepository();
const poiRepo = new PoiRepository();

export interface AnchorEventSummary {
  id: number;
  title: string;
  type: string;
  description: string | null;
  coverImage: string | null;
  locationCount: number;
  locationPool: string[];
  fallbackGallery: string[];
  status: string;
  createdAt: string;
}

function getLocationLabels(event: AnchorEvent): string[] {
  if (!Array.isArray(event.locationPool)) {
    return [];
  }

  const dedupedLabels = new Set<string>();
  for (const location of event.locationPool) {
    const label = location.label.trim();
    if (!label) continue;
    dedupedLabels.add(label);
  }

  return Array.from(dedupedLabels);
}

function toSummary(
  e: AnchorEvent,
  locationPool: string[],
  fallbackGallery: string[],
): AnchorEventSummary {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    description: e.description,
    coverImage: e.coverImage,
    locationCount: Array.isArray(e.locationPool) ? e.locationPool.length : 0,
    locationPool,
    fallbackGallery,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function listAnchorEvents(): Promise<AnchorEventSummary[]> {
  const events = await repo.listActive();

  const uniqueLocationLabels = new Set<string>();
  for (const event of events) {
    for (const label of getLocationLabels(event)) {
      uniqueLocationLabels.add(label);
    }
  }

  const pois = await poiRepo.findByIds(Array.from(uniqueLocationLabels));
  const fallbackGalleryByPoiId = new Map<string, string[]>();
  for (const poi of pois) {
    fallbackGalleryByPoiId.set(poi.id, poi.gallery);
  }

  return events.map((event) => {
    const locationPool = getLocationLabels(event);
    const fallbackGallerySet = new Set<string>();

    for (const label of locationPool) {
      const gallery = fallbackGalleryByPoiId.get(label) ?? [];
      for (const imageUrl of gallery) {
        const normalizedUrl = imageUrl.trim();
        if (!normalizedUrl) continue;
        fallbackGallerySet.add(normalizedUrl);
      }
    }

    return toSummary(event, locationPool, Array.from(fallbackGallerySet));
  });
}
