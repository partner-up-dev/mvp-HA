import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPreferenceTagRepository } from "../../../repositories/AnchorEventPreferenceTagRepository";
import { PoiRepository } from "../../../repositories/PoiRepository";
import {
  AnchorEventPRContextRepository,
  type AnchorEventPRContextRecord,
} from "../../../repositories/AnchorEventPRContextRepository";
import { normalizeLocationPool, type AnchorEvent, type AnchorEventId } from "../../../entities";
import { isJoinableStatus } from "../../pr-core/services/status-rules";
import { isAnchorEventFormModeStartSelectable } from "../services/form-mode";
import { listAnchorEventTimeWindows } from "../services/time-window-pool";

const anchorEventRepo = new AnchorEventRepository();
const poiRepo = new PoiRepository();
const preferenceTagRepo = new AnchorEventPreferenceTagRepository();
const eventContextRepo = new AnchorEventPRContextRepository();

const hasTimeWindowStarted = (
  timeWindow: [string | null, string | null],
  now: Date,
): boolean => {
  const startAt = timeWindow[0];
  if (!startAt) {
    return false;
  }
  const parsed = Date.parse(startAt);
  return Number.isFinite(parsed) && parsed <= now.getTime();
};

const normalizeLocationIds = (
  event: NonNullable<Awaited<ReturnType<AnchorEventRepository["findById"]>>>,
): string[] => {
  return normalizeLocationPool(event.locationPool);
};

const parseStartAt = (value: string | null): Date | null => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const resolveDefaultSelection = (
  event: AnchorEvent,
  records: AnchorEventPRContextRecord[],
  now: Date,
): AnchorEventFormModeData["defaultSelection"] => {
  const rankedRecords = records
    .flatMap((record) => {
      const locationId = record.root.location?.trim() ?? "";
      const startAt = record.root.time[0] ?? null;
      const parsedStartAt = parseStartAt(startAt);
      if (
        !locationId ||
        !parsedStartAt ||
        !isJoinableStatus(record.root.status) ||
        !isAnchorEventFormModeStartSelectable(event, startAt, now)
      ) {
        return [];
      }

      return [
        {
          record,
          locationId,
          startAt: parsedStartAt.toISOString(),
          startTime: parsedStartAt.getTime(),
        },
      ];
    })
    .sort((left, right) => {
      if (left.startTime !== right.startTime) {
        return left.startTime - right.startTime;
      }
      return (
        right.record.root.createdAt.getTime() -
        left.record.root.createdAt.getTime()
      );
    });

  const selected = rankedRecords[0] ?? null;
  if (!selected) {
    return null;
  }

  return {
    sourcePrId: selected.record.root.id,
    locationId: selected.locationId,
    startAt: selected.startAt,
  };
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
  defaultSelection: {
    sourcePrId: number;
    locationId: string;
    startAt: string;
  } | null;
}

export async function getAnchorEventFormModeData(
  eventId: AnchorEventId,
): Promise<AnchorEventFormModeData> {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const locationIds = normalizeLocationIds(event);
  const [pois, tags, visiblePrRecords] = await Promise.all([
    poiRepo.findByIds(locationIds),
    preferenceTagRepo.findByAnchorEventIdAndStatuses(eventId, ["PUBLISHED"]),
    eventContextRepo.findVisibleByAnchorEventId(eventId),
  ]);

  const now = new Date();
  const poiById = new Map(pois.map((poi) => [poi.id, poi.gallery]));
  const startOptions = listAnchorEventTimeWindows(event)
    .filter((timeWindow) => !hasTimeWindowStarted(timeWindow, now))
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
    defaultSelection: resolveDefaultSelection(event, visiblePrRecords, now),
  };
}
