import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { useAnchorEventDetail } from "@/queries/useAnchorEventDetail";
import { useAnchorEvents } from "@/queries/useAnchorEvents";
import {
  HOME_EVENT_UNIT_CONFIG,
  HOME_EVENT_UNIT_KEYS,
  matchHomeEventUnits,
  type HomeEventUnitKey,
} from "@/widgets/home/event-unit-config";

type TimeWindow = [string | null, string | null];

export interface HomeEventUnitData {
  key: HomeEventUnitKey;
  eventId: number | null;
  locations: string[];
  joinedCount: number;
  activeSessionCount: number;
  remainingSlots: number | null;
  nearestStartAt: string | null;
  nearestStartAtLabel: string | null;
  startsSoon: boolean;
  isLoading: boolean;
}

const STARTS_SOON_WINDOW_MS = 2 * 60 * 60 * 1000;

const toDateOrNull = (raw: string | null | undefined): Date | null => {
  if (typeof raw !== "string") return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatNearestStartAtLabel = (
  raw: string | null,
  locale: string,
): string | null => {
  if (!raw) {
    return null;
  }

  const parsed = toDateOrNull(raw);
  if (!parsed) {
    return null;
  }

  const weekdayLabel = parsed.toLocaleDateString(locale, {
    weekday: "short",
  });

  const timeLabel = parsed.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return `${weekdayLabel} ${timeLabel}`;
};

const findNearestStartAt = (timeWindows: TimeWindow[]): string | null => {
  const nowMs = Date.now();
  const starts = timeWindows
    .map(([start]) => toDateOrNull(start))
    .filter((date): date is Date => date !== null)
    .sort((left, right) => left.getTime() - right.getTime());

  if (starts.length === 0) {
    return null;
  }

  const futureStart = starts.find((date) => date.getTime() >= nowMs);
  return (futureStart ?? starts[0]).toISOString();
};

const getLocationLabels = (
  labels: Array<string | null | undefined>,
  fallbackLocation: string,
): string[] => {
  const uniqueLabels = Array.from(
    new Set(
      labels
        .map((label) => (typeof label === "string" ? label.trim() : ""))
        .filter((label) => label.length > 0),
    ),
  );

  if (uniqueLabels.length > 0) {
    return uniqueLabels;
  }

  return [fallbackLocation];
};

export const useHomeEventUnitData = () => {
  const { locale } = useI18n();
  const { data: events, isLoading: isEventsLoading } = useAnchorEvents();

  const matchedUnitEvents = computed(() => matchHomeEventUnits(events.value ?? []));

  const badmintonEventId = computed(
    () => matchedUnitEvents.value.badminton?.id ?? null,
  );
  const runningEventId = computed(() => matchedUnitEvents.value.running?.id ?? null);
  const teaTalkEventId = computed(
    () => matchedUnitEvents.value.teaTalk?.id ?? null,
  );
  const speakingEventId = computed(
    () => matchedUnitEvents.value.speaking?.id ?? null,
  );

  const badmintonDetail = useAnchorEventDetail(badmintonEventId);
  const runningDetail = useAnchorEventDetail(runningEventId);
  const teaTalkDetail = useAnchorEventDetail(teaTalkEventId);
  const speakingDetail = useAnchorEventDetail(speakingEventId);

  const unitsByKey = computed<Record<HomeEventUnitKey, HomeEventUnitData>>(() => {
    const buildUnit = (
      key: HomeEventUnitKey,
      eventId: number | null,
      detail: ReturnType<typeof useAnchorEventDetail>,
    ): HomeEventUnitData => {
      const fallbackLocation = HOME_EVENT_UNIT_CONFIG[key].fallbackLocation;
      const locations = getLocationLabels(
        detail.data.value?.locationPool ?? [],
        fallbackLocation,
      );

      const batches = detail.data.value?.batches ?? [];
      const nearestStartAt = findNearestStartAt(
        batches.map((batch) => batch.timeWindow),
      );
      const nearestStartAtLabel = formatNearestStartAtLabel(
        nearestStartAt,
        locale.value,
      );

      const activePRs = batches.flatMap((batch) =>
        batch.prs.filter(
          (pr) => pr.status !== "CLOSED" && pr.status !== "EXPIRED",
        ),
      );

      const joinedCount = activePRs.reduce((total, pr) => {
        return total + pr.partnerCount;
      }, 0);

      const remainingSlotsList = activePRs
        .map((pr) => {
          if (pr.maxPartners === null) {
            return null;
          }
          return Math.max(pr.maxPartners - pr.partnerCount, 0);
        })
        .filter((value): value is number => value !== null);

      const remainingSlots =
        remainingSlotsList.length > 0
          ? remainingSlotsList.reduce((sum, value) => sum + value, 0)
          : null;

      const nearestStartDate = toDateOrNull(nearestStartAt);
      const nowMs = Date.now();
      const startsSoon = Boolean(
        nearestStartDate &&
          nearestStartDate.getTime() >= nowMs &&
          nearestStartDate.getTime() - nowMs <= STARTS_SOON_WINDOW_MS,
      );

      return {
        key,
        eventId,
        locations,
        joinedCount,
        activeSessionCount: activePRs.length,
        remainingSlots,
        nearestStartAt,
        nearestStartAtLabel,
        startsSoon,
        isLoading:
          Boolean(isEventsLoading.value) || Boolean(detail.isLoading.value),
      };
    };

    return {
      badminton: buildUnit("badminton", badmintonEventId.value, badmintonDetail),
      running: buildUnit("running", runningEventId.value, runningDetail),
      teaTalk: buildUnit("teaTalk", teaTalkEventId.value, teaTalkDetail),
      speaking: buildUnit("speaking", speakingEventId.value, speakingDetail),
    };
  });

  const orderedUnits = computed<HomeEventUnitData[]>(() => {
    const allUnits = HOME_EVENT_UNIT_KEYS.map((key) => unitsByKey.value[key]);

    return allUnits.sort((left, right) => {
      const leftMapped = left.eventId !== null;
      const rightMapped = right.eventId !== null;
      if (leftMapped !== rightMapped) {
        return leftMapped ? -1 : 1;
      }

      if (left.startsSoon !== right.startsSoon) {
        return left.startsSoon ? -1 : 1;
      }

      const leftNearest = toDateOrNull(left.nearestStartAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightNearest =
        toDateOrNull(right.nearestStartAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      if (leftNearest !== rightNearest) {
        return leftNearest - rightNearest;
      }

      return HOME_EVENT_UNIT_KEYS.indexOf(left.key) -
        HOME_EVENT_UNIT_KEYS.indexOf(right.key);
    });
  });

  const leadUnit = computed<HomeEventUnitData>(() => {
    return orderedUnits.value[0] ?? unitsByKey.value.running;
  });

  const subUnits = computed<HomeEventUnitData[]>(() => {
    return orderedUnits.value.filter((unit) => unit.key !== leadUnit.value.key);
  });

  const hasAtLeastOneMappedUnit = computed(() =>
    HOME_EVENT_UNIT_KEYS.some((key) => unitsByKey.value[key].eventId !== null),
  );

  return {
    unitsByKey,
    leadUnit,
    subUnits,
    hasAtLeastOneMappedUnit,
  };
};
