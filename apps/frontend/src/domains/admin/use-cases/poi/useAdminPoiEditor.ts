import { computed, ref, watch, type ComputedRef } from "vue";
import type {
  AdminPoiAvailabilityRulesInput,
  AdminPoisResponse,
} from "@/domains/admin/queries/useAdminPoiManagement";

type PoiRecord = NonNullable<AdminPoisResponse>[number];
type PoiGalleryMap = Record<string, string[]>;
type PoiCapMap = Record<string, number | null>;
type PoiMeetingPointInput = {
  description: string | null;
  imageUrl: string | null;
};
type PoiMeetingPointMap = Record<string, PoiMeetingPointInput | null>;
type PoiAvailabilityRuleInput = AdminPoiAvailabilityRulesInput[number];
export type EditableAvailabilityRule = {
  id: string;
  mode: "INCLUDE" | "EXCLUDE";
  kind: "ABSOLUTE" | "RECURRING";
  startAtLocal: string;
  endAtLocal: string;
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  startTime: string;
  endTime: string;
  weekdays: number[];
  monthDaysText: string;
  monthsText: string;
};
type PoiAvailabilityRulesMap = Record<string, EditableAvailabilityRule[]>;

const PRODUCT_TIME_ZONE_OFFSET_MS = 8 * 60 * 60 * 1000;

export const weekdayOptions = [
  { value: 0, label: "周日" },
  { value: 1, label: "周一" },
  { value: 2, label: "周二" },
  { value: 3, label: "周三" },
  { value: 4, label: "周四" },
  { value: 5, label: "周五" },
  { value: 6, label: "周六" },
] as const;

const normalizeGallery = (gallery: string[]): string[] => {
  const normalized = new Set<string>();
  for (const raw of gallery) {
    const item = raw.trim();
    if (!item) continue;
    normalized.add(item);
  }
  return Array.from(normalized);
};

const normalizeNullablePositiveInteger = (value: unknown): number | null => {
  if (typeof value === "string" && value.trim().length === 0) {
    return null;
  }
  const parsed =
    typeof value === "number" ? value : Number(String(value).trim());
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

const toDatetimeLocalValue = (isoValue: string): string => {
  const parsed = Date.parse(isoValue);
  if (!Number.isFinite(parsed)) return "";
  return new Date(parsed + PRODUCT_TIME_ZONE_OFFSET_MS)
    .toISOString()
    .slice(0, 16);
};

const fromDatetimeLocalValue = (value: string): string | null => {
  if (!value) return null;
  const parsed = new Date(`${value}:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};

const toNumberListText = (values: readonly number[]): string =>
  values.join(",");

const parseNumberList = (
  value: string,
  min: number,
  max: number,
): number[] =>
  Array.from(
    new Set(
      value
        .split(",")
        .map((entry) => Number(entry.trim()))
        .filter(
          (entry) => Number.isInteger(entry) && entry >= min && entry <= max,
        ),
    ),
  ).sort((left, right) => left - right);

const toEditableAvailabilityRule = (
  rule: PoiAvailabilityRuleInput,
): EditableAvailabilityRule => {
  if (rule.kind === "ABSOLUTE") {
    return {
      id: rule.id,
      mode: rule.mode,
      kind: "ABSOLUTE",
      startAtLocal: toDatetimeLocalValue(rule.startAt),
      endAtLocal: toDatetimeLocalValue(rule.endAt),
      frequency: "DAILY",
      startTime: "09:00",
      endTime: "18:00",
      weekdays: [],
      monthDaysText: "",
      monthsText: "",
    };
  }

  return {
    id: rule.id,
    mode: rule.mode,
    kind: "RECURRING",
    startAtLocal: "",
    endAtLocal: "",
    frequency: rule.frequency,
    startTime: rule.startTime,
    endTime: rule.endTime,
    weekdays: [...rule.weekdays],
    monthDaysText: toNumberListText(rule.monthDays),
    monthsText: toNumberListText(rule.months),
  };
};

const buildAvailabilityRulesInput = (
  rules: readonly EditableAvailabilityRule[],
): AdminPoiAvailabilityRulesInput =>
  rules.flatMap((rule): AdminPoiAvailabilityRulesInput => {
    if (rule.kind === "ABSOLUTE") {
      const startAt = fromDatetimeLocalValue(rule.startAtLocal);
      const endAt = fromDatetimeLocalValue(rule.endAtLocal);
      if (!startAt || !endAt || Date.parse(endAt) <= Date.parse(startAt)) {
        return [];
      }
      return [
        {
          id: rule.id,
          mode: rule.mode,
          kind: "ABSOLUTE",
          startAt,
          endAt,
        },
      ];
    }

    const monthDays = parseNumberList(rule.monthDaysText, 1, 31);
    const months = parseNumberList(rule.monthsText, 1, 12);
    if (rule.frequency === "WEEKLY" && rule.weekdays.length === 0) {
      return [];
    }
    if (rule.frequency === "MONTHLY" && monthDays.length === 0) {
      return [];
    }
    if (
      rule.frequency === "YEARLY" &&
      (monthDays.length === 0 || months.length === 0)
    ) {
      return [];
    }

    return [
      {
        id: rule.id,
        mode: rule.mode,
        kind: "RECURRING",
        frequency: rule.frequency,
        startTime: rule.startTime || "09:00",
        endTime: rule.endTime || "18:00",
        weekdays: rule.frequency === "WEEKLY" ? [...rule.weekdays] : [],
        monthDays:
          rule.frequency === "MONTHLY" || rule.frequency === "YEARLY"
            ? monthDays
            : [],
        months: rule.frequency === "YEARLY" ? months : [],
      },
    ];
  });

export const useAdminPoiEditor = ({
  pois,
  selectedPoiId,
}: {
  pois: ComputedRef<PoiRecord[]>;
  selectedPoiId: ComputedRef<string | null>;
}) => {
  const manualGalleryUrl = ref("");
  const isUploadingGalleryImage = ref(false);
  const poiGalleryById = ref<PoiGalleryMap>({});
  const poiCapById = ref<PoiCapMap>({});
  const poiMeetingPointById = ref<PoiMeetingPointMap>({});
  const poiAvailabilityRulesById = ref<PoiAvailabilityRulesMap>({});
  const dirtyPoiIds = ref<Set<string>>(new Set());

  const selectedPoiGallery = computed<string[]>(() => {
    const poiId = selectedPoiId.value;
    if (!poiId) return [];
    return poiGalleryById.value[poiId] ?? [];
  });

  const selectedPoiCap = computed<number | null>(() => {
    const poiId = selectedPoiId.value;
    if (!poiId) return null;
    return poiCapById.value[poiId] ?? null;
  });

  const selectedPoiCapText = computed<string>({
    get: () =>
      selectedPoiCap.value === null ? "" : String(selectedPoiCap.value),
    set: (value) => {
      setSelectedPoiCap(normalizeNullablePositiveInteger(value));
    },
  });

  const selectedPoiMeetingPoint = computed<PoiMeetingPointInput | null>(() => {
    const poiId = selectedPoiId.value;
    if (!poiId) return null;
    return poiMeetingPointById.value[poiId] ?? null;
  });

  const selectedPoiMeetingPointDescription = computed<string>({
    get: () => selectedPoiMeetingPoint.value?.description ?? "",
    set: (value) => {
      setSelectedPoiMeetingPoint({
        description: value.trim() || null,
        imageUrl: selectedPoiMeetingPoint.value?.imageUrl ?? null,
      });
    },
  });

  const selectedPoiMeetingPointImageUrl = computed<string>({
    get: () => selectedPoiMeetingPoint.value?.imageUrl ?? "",
    set: (value) => {
      setSelectedPoiMeetingPoint({
        description: selectedPoiMeetingPoint.value?.description ?? null,
        imageUrl: value.trim() || null,
      });
    },
  });

  const selectedPoiAvailabilityRules = computed<EditableAvailabilityRule[]>(
    () => {
      const poiId = selectedPoiId.value;
      if (!poiId) return [];
      return poiAvailabilityRulesById.value[poiId] ?? [];
    },
  );

  const markSelectedPoiDirty = () => {
    const poiId = selectedPoiId.value;
    if (!poiId) return;
    const nextDirtyPoiIds = new Set(dirtyPoiIds.value);
    nextDirtyPoiIds.add(poiId);
    dirtyPoiIds.value = nextDirtyPoiIds;
  };

  const setSelectedPoiGallery = (
    gallery: string[],
    options?: { markDirty?: boolean },
  ) => {
    const poiId = selectedPoiId.value;
    if (!poiId) return;

    const markDirty = options?.markDirty ?? true;
    poiGalleryById.value = {
      ...poiGalleryById.value,
      [poiId]: normalizeGallery(gallery),
    };
    if (markDirty) {
      markSelectedPoiDirty();
    }
  };

  const setSelectedPoiCap = (
    perTimeWindowCap: number | null,
    options?: { markDirty?: boolean },
  ) => {
    const poiId = selectedPoiId.value;
    if (!poiId) return;

    poiCapById.value = {
      ...poiCapById.value,
      [poiId]: perTimeWindowCap,
    };
    if (options?.markDirty ?? true) {
      markSelectedPoiDirty();
    }
  };

  const setSelectedPoiMeetingPoint = (
    meetingPoint: PoiMeetingPointInput | null,
    options?: { markDirty?: boolean },
  ) => {
    const poiId = selectedPoiId.value;
    if (!poiId) return;

    const normalized =
      meetingPoint?.description || meetingPoint?.imageUrl
        ? meetingPoint
        : null;
    poiMeetingPointById.value = {
      ...poiMeetingPointById.value,
      [poiId]: normalized,
    };
    if (options?.markDirty ?? true) {
      markSelectedPoiDirty();
    }
  };

  const setSelectedPoiAvailabilityRules = (
    rules: EditableAvailabilityRule[],
    options?: { markDirty?: boolean },
  ) => {
    const poiId = selectedPoiId.value;
    if (!poiId) return;

    poiAvailabilityRulesById.value = {
      ...poiAvailabilityRulesById.value,
      [poiId]: rules,
    };
    if (options?.markDirty ?? true) {
      markSelectedPoiDirty();
    }
  };

  watch(
    pois,
    (nextPois) => {
      const nextMap: PoiGalleryMap = {};
      const nextCapMap: PoiCapMap = {};
      const nextMeetingPointMap: PoiMeetingPointMap = {};
      const nextAvailabilityRulesMap: PoiAvailabilityRulesMap = {};
      const nextDirtyPoiIds = new Set<string>();

      for (const poi of nextPois) {
        const isDirty = dirtyPoiIds.value.has(poi.id);
        const localGallery = poiGalleryById.value[poi.id];
        const localCap = poiCapById.value[poi.id];
        const localMeetingPoint = poiMeetingPointById.value[poi.id];
        const localAvailabilityRules = poiAvailabilityRulesById.value[poi.id];
        if (isDirty && localGallery !== undefined) {
          nextMap[poi.id] = normalizeGallery(localGallery);
          nextCapMap[poi.id] = localCap ?? null;
          nextMeetingPointMap[poi.id] = localMeetingPoint ?? null;
          nextAvailabilityRulesMap[poi.id] = localAvailabilityRules ?? [];
          nextDirtyPoiIds.add(poi.id);
          continue;
        }
        nextMap[poi.id] = normalizeGallery(poi.gallery);
        nextCapMap[poi.id] = poi.perTimeWindowCap ?? null;
        nextMeetingPointMap[poi.id] = poi.meetingPoint ?? null;
        nextAvailabilityRulesMap[poi.id] =
          poi.availabilityRules.map(toEditableAvailabilityRule);
      }

      poiGalleryById.value = nextMap;
      poiCapById.value = nextCapMap;
      poiMeetingPointById.value = nextMeetingPointMap;
      poiAvailabilityRulesById.value = nextAvailabilityRulesMap;
      dirtyPoiIds.value = nextDirtyPoiIds;
    },
    { immediate: true },
  );

  const handleAddManualUrl = () => {
    const url = manualGalleryUrl.value.trim();
    if (!url) return;
    setSelectedPoiGallery([...selectedPoiGallery.value, url]);
    manualGalleryUrl.value = "";
  };

  const handleGalleryUploaded = (uploadedUrl: string) => {
    setSelectedPoiGallery([...selectedPoiGallery.value, uploadedUrl]);
    manualGalleryUrl.value = "";
  };

  const handleRemoveGalleryImage = (index: number) => {
    const currentGallery = [...selectedPoiGallery.value];
    if (index < 0 || index >= currentGallery.length) return;
    currentGallery.splice(index, 1);
    setSelectedPoiGallery(currentGallery);
  };

  const handleAddAvailabilityRule = () => {
    const now = Date.now();
    setSelectedPoiAvailabilityRules([
      ...selectedPoiAvailabilityRules.value,
      {
        id: `rule-${now}`,
        mode: "INCLUDE",
        kind: "RECURRING",
        startAtLocal: "",
        endAtLocal: "",
        frequency: "WEEKLY",
        startTime: "09:00",
        endTime: "18:00",
        weekdays: [5, 6, 0],
        monthDaysText: "",
        monthsText: "",
      },
    ]);
  };

  const handleRemoveAvailabilityRule = (index: number) => {
    const rules = [...selectedPoiAvailabilityRules.value];
    if (index < 0 || index >= rules.length) return;
    rules.splice(index, 1);
    setSelectedPoiAvailabilityRules(rules);
  };

  const buildSelectedPoiInput = () => ({
    gallery: normalizeGallery(selectedPoiGallery.value),
    perTimeWindowCap: selectedPoiCap.value,
    availabilityRules: buildAvailabilityRulesInput(
      selectedPoiAvailabilityRules.value,
    ),
    meetingPoint: selectedPoiMeetingPoint.value,
  });

  const applySavedPoi = (poiId: string, poi: PoiRecord) => {
    setSelectedPoiGallery(poi.gallery, { markDirty: false });
    setSelectedPoiCap(poi.perTimeWindowCap ?? null, { markDirty: false });
    setSelectedPoiMeetingPoint(poi.meetingPoint ?? null, {
      markDirty: false,
    });
    setSelectedPoiAvailabilityRules(
      poi.availabilityRules.map(toEditableAvailabilityRule),
      { markDirty: false },
    );
    const nextDirtyPoiIds = new Set(dirtyPoiIds.value);
    nextDirtyPoiIds.delete(poiId);
    dirtyPoiIds.value = nextDirtyPoiIds;
  };

  return {
    manualGalleryUrl,
    isUploadingGalleryImage,
    selectedPoiGallery,
    selectedPoiCapText,
    selectedPoiMeetingPoint,
    selectedPoiMeetingPointDescription,
    selectedPoiMeetingPointImageUrl,
    selectedPoiAvailabilityRules,
    markSelectedPoiDirty,
    handleAddManualUrl,
    handleGalleryUploaded,
    handleRemoveGalleryImage,
    handleAddAvailabilityRule,
    handleRemoveAvailabilityRule,
    buildSelectedPoiInput,
    applySavedPoi,
  };
};
