import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPreferenceTagRepository } from "../../../repositories/AnchorEventPreferenceTagRepository";
import { PoiRepository } from "../../../repositories/PoiRepository";
import type { AnchorEventId } from "../../../entities";
import { listAnchorEventTimeWindows } from "../services/time-window-pool";

const anchorEventRepo = new AnchorEventRepository();
const poiRepo = new PoiRepository();
const preferenceTagRepo = new AnchorEventPreferenceTagRepository();

const hasTimeWindowStarted = (timeWindow: [string | null, string | null]): boolean => {
  const startAt = timeWindow[0];
  if (!startAt) {
    return false;
  }
  const parsed = Date.parse(startAt);
  return Number.isFinite(parsed) && parsed <= Date.now();
};

const normalizeLocationIds = (
  event: NonNullable<Awaited<ReturnType<AnchorEventRepository["findById"]>>>,
): string[] => {
  const unique = new Set<string>();
  for (const locationId of event.systemLocationPool) {
    const normalized = locationId.trim();
    if (normalized) {
      unique.add(normalized);
    }
  }
  for (const entry of event.userLocationPool) {
    const normalized = entry.id.trim();
    if (normalized) {
      unique.add(normalized);
    }
  }
  return Array.from(unique);
};

export interface AnchorEventFormModeData {
  event: {
    id: number;
    title: string;
    type: string;
    description: string | null;
    durationMinutes: number | null;
    earliestLeadMinutes: number | null;
    defaultMinPartners: number | null;
    defaultMaxPartners: number | null;
  };
  locations: Array<{
    id: string;
    gallery: string[];
  }>;
  startOptions: Array<{
    key: string;
    startAt: string;
    endAt: string;
  }>;
  presetTags: Array<{
    id: number;
    label: string;
    description: string;
  }>;
}

export async function getAnchorEventFormModeData(
  eventId: AnchorEventId,
): Promise<AnchorEventFormModeData> {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const locationIds = normalizeLocationIds(event);
  const [pois, tags] = await Promise.all([
    poiRepo.findByIds(locationIds),
    preferenceTagRepo.findByAnchorEventIdAndStatuses(eventId, ["PUBLISHED"]),
  ]);

  const poiById = new Map(pois.map((poi) => [poi.id, poi.gallery]));
  const startOptions = listAnchorEventTimeWindows(event)
    .filter((timeWindow) => !hasTimeWindowStarted(timeWindow))
    .flatMap((timeWindow) => {
      const [startAt, endAt] = timeWindow;
      if (!startAt || !endAt) {
        return [];
      }
      return [
        {
          key: `${startAt}::${endAt}`,
          startAt,
          endAt,
        },
      ];
    });

  return {
    event: {
      id: event.id,
      title: event.title,
      type: event.type,
      description: event.description,
      durationMinutes: event.timePoolConfig.durationMinutes,
      earliestLeadMinutes: event.timePoolConfig.earliestLeadMinutes,
      defaultMinPartners: event.defaultMinPartners,
      defaultMaxPartners: event.defaultMaxPartners,
    },
    locations: locationIds.map((id) => ({
      id,
      gallery: [...(poiById.get(id) ?? [])],
    })),
    startOptions,
    presetTags: tags.map((tag) => ({
      id: tag.id,
      label: tag.label,
      description: tag.description,
    })),
  };
}
