/**
 * Use-case: List all active Anchor Events for the Event Plaza.
 */

import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import {
  type AnchorEvent,
  normalizeSystemLocationPool,
  normalizeUserLocationPool,
} from "../../../entities/anchor-event";
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
  pois: Array<{
    id: string;
    gallery: string[];
  }>;
  fallbackGallery: string[];
  status: string;
  createdAt: string;
}

const LOCATION_LOOKUP_PUNCTUATION_RE = /[\s\u3000\-_/.,，。、()（）[\]【】·•]/g;

function normalizeLocationLookupKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(LOCATION_LOOKUP_PUNCTUATION_RE, "")
    .replace(/校区/g, "")
    .replace(/校园/g, "")
    .replace(/校/g, "");
}

function getLocationLabels(event: AnchorEvent): string[] {
  const systemLocations = normalizeSystemLocationPool(event.systemLocationPool);
  const userLocations = normalizeUserLocationPool(event.userLocationPool).map(
    (entry) => entry.id,
  );
  return Array.from(new Set([...systemLocations, ...userLocations]));
}

function toSummary(
  e: AnchorEvent,
  locationPool: string[],
  pois: Array<{
    id: string;
    gallery: string[];
  }>,
  fallbackGallery: string[],
): AnchorEventSummary {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    description: e.description,
    coverImage: e.coverImage,
    locationCount: locationPool.length,
    locationPool,
    pois,
    fallbackGallery,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  };
}

function shuffledCopy<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    const candidate = shuffled[swapIndex];

    if (current === undefined || candidate === undefined) {
      continue;
    }

    shuffled[index] = candidate;
    shuffled[swapIndex] = current;
  }

  return shuffled;
}

export async function listAnchorEvents(): Promise<AnchorEventSummary[]> {
  // Shuffle once per request to avoid long-term top-item exposure bias.
  const events = shuffledCopy(await repo.listActive());

  const uniqueLocationLabels = new Set<string>();
  for (const event of events) {
    for (const label of getLocationLabels(event)) {
      uniqueLocationLabels.add(label);
    }
  }

  const locationLabels = Array.from(uniqueLocationLabels);
  const pois = await poiRepo.findByIds(locationLabels);
  const poiById = new Map<string, { id: string; gallery: string[] }>();
  for (const poi of pois) {
    poiById.set(poi.id, {
      id: poi.id,
      gallery: poi.gallery,
    });
  }

  const needNormalizedFallback = pois.length < locationLabels.length;
  const poisByNormalizedId = new Map<string, Array<{ id: string; gallery: string[] }>>();
  if (needNormalizedFallback) {
    const allPois = await poiRepo.listAll();
    for (const poi of allPois) {
      const normalizedPoiId = normalizeLocationLookupKey(poi.id);
      if (!normalizedPoiId) {
        continue;
      }

      const existingPois = poisByNormalizedId.get(normalizedPoiId) ?? [];
      existingPois.push({
        id: poi.id,
        gallery: poi.gallery,
      });
      poisByNormalizedId.set(normalizedPoiId, existingPois);
    }
  }

  return events.map((event) => {
    const locationPool = getLocationLabels(event);
    const matchedPoisById = new Map<string, { id: string; gallery: string[] }>();
    const fallbackGallerySet = new Set<string>();

    for (const label of locationPool) {
      const exactPoi = poiById.get(label);
      if (exactPoi) {
        matchedPoisById.set(exactPoi.id, exactPoi);
        for (const imageUrl of exactPoi.gallery) {
          const normalizedUrl = imageUrl.trim();
          if (!normalizedUrl) continue;
          fallbackGallerySet.add(normalizedUrl);
        }
        continue;
      }

      if (needNormalizedFallback) {
        const normalizedLabel = normalizeLocationLookupKey(label);
        if (normalizedLabel) {
          const normalizedPois = poisByNormalizedId.get(normalizedLabel) ?? [];
          for (const normalizedPoi of normalizedPois) {
            matchedPoisById.set(normalizedPoi.id, normalizedPoi);
            for (const imageUrl of normalizedPoi.gallery) {
              const normalizedUrl = imageUrl.trim();
              if (!normalizedUrl) continue;
              fallbackGallerySet.add(normalizedUrl);
            }
          }
        }
      }
    }

    return toSummary(
      event,
      locationPool,
      Array.from(matchedPoisById.values()),
      Array.from(fallbackGallerySet),
    );
  });
}
