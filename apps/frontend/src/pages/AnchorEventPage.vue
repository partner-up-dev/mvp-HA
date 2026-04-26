<template>
  <FooterRevealPageScaffold
    :class="[
      'anchor-event-page',
      { 'anchor-event-page--card-active': isCardStageActive },
    ]"
    data-page="event-detail"
  >
    <template #header>
      <PageHeader
        v-if="detail"
        class="anchor-event-page__header"
        :title="detail.title"
        :subtitle="detail.description ?? undefined"
        :back-fallback-to="{ name: 'event-plaza' }"
        data-region="event-header"
      >
        <template #top-actions>
          <div
            class="view-mode-switch"
            role="group"
            :aria-label="t('anchorEvent.viewMode.ariaLabel')"
            data-region="view-mode"
          >
            <button
              type="button"
              class="view-mode-switch__button"
              :class="{
                'view-mode-switch__button--active': viewMode === 'CARD',
              }"
              @click="handleSwitchViewMode('CARD')"
            >
              {{ t("anchorEvent.viewMode.card") }}
            </button>
            <button
              type="button"
              class="view-mode-switch__button"
              :class="{
                'view-mode-switch__button--active': viewMode === 'LIST',
              }"
              @click="handleSwitchViewMode('LIST')"
            >
              {{ t("anchorEvent.viewMode.list") }}
            </button>
          </div>
        </template>
      </PageHeader>
    </template>

    <div v-if="isLoading" class="loading-state">
      {{ t("common.loading") }}
    </div>

    <div v-else-if="isError" class="error-state">
      {{ t("anchorEvent.loadFailed") }}
      <router-link :to="{ name: 'event-plaza' }" class="back-link">
        {{ t("anchorEvent.backToPlaza") }}
      </router-link>
    </div>
    <template v-else-if="detail">
      <template v-if="viewMode === 'CARD'">
        <AnchorEventCardModeSurface
          :active-demand-card="activeDemandCard"
          :stack-preview-cards="stackPreviewCards"
          :is-card-routing="isCardRouting"
          :card-action-error="cardActionError"
          :drag-hint-token="cardDragHintToken"
          :card-create-time-window-options="cardCreateTimeWindowOptions"
          :card-create-time-window-key="cardCreateTimeWindowKey"
          :card-create-location-id="cardCreateLocationId"
          :card-create-location-options="cardCreateLocationOptionViewModels"
          :create-action-error-message="createActionErrorMessage"
          :is-create-pending="isCreatePending"
          :event-id="detail.id"
          :event-title="detail.title"
          :event-beta-group-qr-code="detail.betaGroupQrCode"
          @consume-drag-hint-window="consumeCardDragHintWindow"
          @skip-active-card="handleSkipActiveCard"
          @view-active-card-detail="handleViewActiveCardDetail"
          @update:card-create-time-window-key="cardCreateTimeWindowKey = $event"
          @update:card-create-location-id="cardCreateLocationId = $event"
          @create-from-card-empty="handleCreateFromCardEmpty"
        />
      </template>

      <template v-else>
        <AnchorEventListModeSurface
          :has-browse-time-windows="detail.browseTimeWindows.length > 0"
          :date-tabs="dateTabs"
          :selected-date-key="selectedDateKey"
          :selected-date-group="selectedDateGroup"
          :create-time-window-choices="listModeCreateTimeWindowChoices"
          :event-id="detail.id"
          :event-title="detail.title"
          :event-beta-group-qr-code="detail.betaGroupQrCode"
          :is-create-pending="isCreatePending"
          :create-action-error-message="createActionErrorMessage"
          :resolve-cover-image="resolveCoverImage"
          @select-date="selectedDateKey = $event"
          @create-in-list="handleCreateInList"
        />
      </template>
      <div
        v-if="detail.exhausted"
        class="exhausted-banner"
        data-region="exhausted-banner"
      >
        <p class="exhausted-text">{{ t("anchorEvent.exhausted") }}</p>
        <p class="exhausted-hint">{{ t("anchorEvent.subscribeHint") }}</p>
        <router-link :to="{ name: 'event-plaza' }" class="discover-btn">
          {{ t("anchorEvent.discoverOthers") }}
        </router-link>
      </div>
    </template>

    <template #footer>
      <FullCommonFooter data-region="footer" />
    </template>
  </FooterRevealPageScaffold>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import FullCommonFooter from "@/domains/landing/ui/sections/FullCommonFooter.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import AnchorEventCardModeSurface from "@/domains/event/ui/surfaces/AnchorEventCardModeSurface.vue";
import AnchorEventListModeSurface from "@/domains/event/ui/surfaces/AnchorEventListModeSurface.vue";
import FooterRevealPageScaffold from "@/shared/ui/layout/FooterRevealPageScaffold.vue";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";
import { useAnchorEventDemandCards } from "@/domains/event/queries/useAnchorEventDemandCards";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";
import {
  prDetailPath,
} from "@/domains/pr/routing/routes";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import { toDemandCardViewModels } from "@/domains/event/model/demand-cards";
import {
  pickRandomPoiGalleryImage,
  toPoiGalleryMap,
} from "@/domains/event/model/poi-gallery";
import type { ApiError } from "@/shared/api/error";
import {
  addDaysToProductLocalDateKey,
  getTodayProductLocalDateKey,
  parseProductLocalDateKey,
  type ProductLocalDateKey,
} from "@/shared/datetime/productLocalDate";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";

type EventViewMode = "LIST" | "CARD";
type TimeWindow = [string | null, string | null];

type LocationOption =
  AnchorEventDetailResponse["createTimeWindows"][number]["locationOptions"][number];

type BrowseTimeWindowEntry =
  AnchorEventDetailResponse["browseTimeWindows"][number];

type CreateTimeWindowEntry =
  AnchorEventDetailResponse["createTimeWindows"][number];

type CardTimeWindowOption = {
  key: string;
  label: string;
};

type CardCreateLocationOptionViewModel = {
  locationId: string;
  label: string;
  disabled: boolean;
};

type ListModeTimeWindowViewModel = {
  entry: BrowseTimeWindowEntry;
  timeLabel: string;
};

type ListModeDateGroupViewModel = {
  key: string;
  label: string;
  tabClass?: string;
  timeWindows: ListModeTimeWindowViewModel[];
};

type ListModeCreateTimeWindowChoice = {
  entry: CreateTimeWindowEntry;
  optionLabel: string;
  subtitleLabel: string;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const { prefersReducedMotion } = useReducedMotion();

const CARD_OVERFLOW_GUARD_CLASS = "anchor-event-card-overflow-guard";
const CARD_MODE_DRAG_HINT_DELAY_MS = 3000;

const syncCardOverflowGuard = (enabled: boolean) => {
  if (typeof document === "undefined") {
    return;
  }

  document.documentElement.classList.toggle(
    CARD_OVERFLOW_GUARD_CLASS,
    enabled,
  );
  document.body.classList.toggle(CARD_OVERFLOW_GUARD_CLASS, enabled);
};

const normalizeQueryViewMode = (value: string): EventViewMode | null => {
  const normalized = value.trim().toLowerCase();
  if (normalized === "card") {
    return "CARD";
  }
  if (normalized === "list") {
    return "LIST";
  }
  return null;
};

const resolveQueryViewMode = (value: unknown): EventViewMode | null => {
  if (typeof value === "string") {
    return normalizeQueryViewMode(value);
  }
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }

    const normalized = normalizeQueryViewMode(item);
    if (normalized) {
      return normalized;
    }
  }

  return null;
};

const resolveInitialViewMode = (): EventViewMode =>
  resolveQueryViewMode(route.query.mode) ?? "LIST";

const viewMode = ref<EventViewMode>("LIST");
const selectedDateKey = ref<string | null>(null);
const processedCardKeys = ref<string[]>([]);
const cardActionError = ref<string | null>(null);
const isCardRouting = ref(false);
const cardDragHintToken = ref(0);

const cardCreateTimeWindowKey = ref<string | null>(null);
const cardCreateLocationId = ref("");
let cardDragHintTimerId: number | null = null;

const eventId = computed(() => {
  const raw = route.params.eventId;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
});

const clearCardDragHintTimer = () => {
  if (typeof window === "undefined" || cardDragHintTimerId === null) {
    return;
  }

  window.clearTimeout(cardDragHintTimerId);
  cardDragHintTimerId = null;
};

const scheduleCardDragHint = () => {
  clearCardDragHintTimer();

  if (
    typeof window === "undefined" ||
    prefersReducedMotion.value ||
    !isCardStageActive.value
  ) {
    return;
  }

  cardDragHintTimerId = window.setTimeout(() => {
    cardDragHintTimerId = null;

    if (!isCardStageActive.value || prefersReducedMotion.value) {
      return;
    }

    cardDragHintToken.value += 1;
  }, CARD_MODE_DRAG_HINT_DELAY_MS);
};

const consumeCardDragHintWindow = () => {
  clearCardDragHintTimer();
};

const applyViewMode = (mode: EventViewMode) => {
  if (
    mode === "CARD" &&
    viewMode.value !== "CARD" &&
    remainingDemandCards.value.length === 0 &&
    processedCardKeys.value.length > 0
  ) {
    processedCardKeys.value = [];
    cardActionError.value = null;
  }

  if (mode !== "CARD") {
    consumeCardDragHintWindow();
  }

  viewMode.value = mode;
};

const handleSwitchViewMode = (mode: EventViewMode) => {
  if (viewMode.value === mode) {
    return;
  }

  applyViewMode(mode);
};

watch(
  [eventId, () => route.query.mode],
  () => {
    applyViewMode(resolveInitialViewMode());
  },
  { immediate: true },
);

watch(eventId, () => {
  consumeCardDragHintWindow();
});

const {
  data: detail,
  isLoading: isDetailLoading,
  isError: isDetailError,
} = useAnchorEventDetail(eventId);
const {
  data: demandCards,
  isLoading: isDemandCardsLoading,
  isError: isDemandCardsError,
} = useAnchorEventDemandCards(eventId);
const createEventAssistedPRMutation = useCreateEventAssistedPR();

const isLoading = computed(
  () => isDetailLoading.value || isDemandCardsLoading.value,
);
const isError = computed(
  () => isDetailError.value || isDemandCardsError.value,
);

const isCreatePending = computed(
  () => createEventAssistedPRMutation.isPending.value,
);

const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
const createActionErrorMessage = computed(() => {
  const createAnchorError = createEventAssistedPRMutation.error
    .value as CreateEventAssistedPRError | null;
  if (createAnchorError) {
    switch (createAnchorError.code) {
      case JOIN_TIME_WINDOW_CONFLICT_CODE:
        return t("anchorEvent.createCard.errors.timeWindowConflict");
      case "WECHAT_AUTH_REQUIRED":
        return t("anchorEvent.createCard.errors.wechatAuthRequired");
      case "LOCATION_CAP_REACHED":
        return t("anchorEvent.createCard.errors.locationCapReached");
      case "ANCHOR_EVENT_NOT_FOUND":
        return t("anchorEvent.createCard.errors.eventUnavailable");
      default:
        return t("anchorEvent.createCard.errors.createFailed");
    }
  }
  return null;
});

const resolveTimeWindowStartTimestamp = (timeWindow: TimeWindow): number => {
  const [start] = timeWindow;
  if (!start) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(start).getTime();
  if (!Number.isFinite(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return timestamp;
};

const resolveTimeWindowEndTimestamp = (timeWindow: TimeWindow): number => {
  const [, end] = timeWindow;
  if (!end) {
    return Number.POSITIVE_INFINITY;
  }

  const timestamp = new Date(end).getTime();
  if (!Number.isFinite(timestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return timestamp;
};

const sortedBrowseTimeWindows = computed(() => {
  const timeWindows = detail.value?.browseTimeWindows ?? [];
  return [...timeWindows].sort((left, right) => {
    const leftTimestamp = resolveTimeWindowStartTimestamp(left.timeWindow);
    const rightTimestamp = resolveTimeWindowStartTimestamp(right.timeWindow);
    return leftTimestamp - rightTimestamp;
  });
});

const sortedCreateTimeWindows = computed(() => {
  const timeWindows = detail.value?.createTimeWindows ?? [];
  return [...timeWindows].sort((left, right) => {
    const leftTimestamp = resolveTimeWindowStartTimestamp(left.timeWindow);
    const rightTimestamp = resolveTimeWindowStartTimestamp(right.timeWindow);
    return leftTimestamp - rightTimestamp;
  });
});

const hasTimeWindowStarted = (timeWindow: TimeWindow): boolean => {
  const startTimestamp = resolveTimeWindowStartTimestamp(timeWindow);
  if (!Number.isFinite(startTimestamp)) {
    return false;
  }

  return Date.now() >= startTimestamp;
};

const isEndedTimeWindow = (timeWindow: TimeWindow): boolean => {
  const endTimestamp = resolveTimeWindowEndTimestamp(timeWindow);
  if (Number.isFinite(endTimestamp)) {
    return Date.now() >= endTimestamp;
  }

  return hasTimeWindowStarted(timeWindow);
};

const upcomingSortedCreateTimeWindows = computed(() =>
  sortedCreateTimeWindows.value.filter(
    (entry) => !hasTimeWindowStarted(entry.timeWindow),
  ),
);

const PRODUCT_TIME_ZONE = "Asia/Shanghai";

const productLocalTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const productLocalWeekdayFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: PRODUCT_TIME_ZONE,
  weekday: "short",
});

const resolveRelativeDayLabel = (
  dateKey: ProductLocalDateKey,
): "今天" | "明天" | "后天" | null => {
  const todayDateKey = getTodayProductLocalDateKey();
  if (dateKey === todayDateKey) {
    return "今天";
  }

  const tomorrowDateKey = addDaysToProductLocalDateKey(todayDateKey, 1);
  if (tomorrowDateKey !== null && dateKey === tomorrowDateKey) {
    return "明天";
  }

  const dayAfterTomorrowDateKey = addDaysToProductLocalDateKey(
    todayDateKey,
    2,
  );
  if (
    dayAfterTomorrowDateKey !== null &&
    dateKey === dayAfterTomorrowDateKey
  ) {
    return "后天";
  }

  return null;
};

const resolveTimeWindowDateKey = (
  timeWindow: TimeWindow,
): ProductLocalDateKey | null => {
  const [start] = timeWindow;
  if (!start) {
    return null;
  }

  const date = new Date(start);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return getTodayProductLocalDateKey(date);
};

const formatDateKeyLabel = (dateKey: ProductLocalDateKey): string => {
  const parsed = parseProductLocalDateKey(dateKey);
  if (!parsed) {
    return dateKey;
  }

  const month = parsed.getUTCMonth() + 1;
  const day = parsed.getUTCDate();
  const relativeDayLabel = resolveRelativeDayLabel(dateKey);
  if (relativeDayLabel) {
    return `${month}月${day}日(${relativeDayLabel})`;
  }

  return `${month}月${day}日${productLocalWeekdayFormatter.format(parsed)}`;
};

function formatTimeWindowLabel(timeWindow: TimeWindow, index: number): string {
  const [start] = timeWindow;
  if (start) {
    try {
      const date = new Date(start);
      const dateKey = resolveTimeWindowDateKey(timeWindow);
      if (Number.isNaN(date.getTime()) || dateKey === null) {
        return `${t("anchorEvent.batchLabel")} ${index + 1}`;
      }

      const datePart = formatDateKeyLabel(dateKey);
      const timePart = productLocalTimeFormatter.format(date);
      return `${datePart} ${timePart}`;
    } catch {
      return `${t("anchorEvent.batchLabel")} ${index + 1}`;
    }
  }

  return `${t("anchorEvent.batchLabel")} ${index + 1}`;
}

function formatTimeWindowTimeLabel(timeWindow: TimeWindow, index: number): string {
  const [start] = timeWindow;
  if (start) {
    try {
      const date = new Date(start);
      if (!Number.isNaN(date.getTime())) {
        return productLocalTimeFormatter.format(date);
      }
    } catch {
      // fall through to default label
    }
  }

  return `${t("anchorEvent.batchLabel")} ${index + 1}`;
}

const formatTimeWindowOptionLabel = (
  entry: CreateTimeWindowEntry,
  index: number,
): string => formatTimeWindowLabel(entry.timeWindow, index);

const dateGroups = computed<ListModeDateGroupViewModel[]>(() => {
  const groups: ListModeDateGroupViewModel[] = [];
  const groupIndexByKey = new Map<string, number>();

  sortedBrowseTimeWindows.value.forEach((entry, index) => {
    const groupKey =
      resolveTimeWindowDateKey(entry.timeWindow) ?? `time-window:${entry.key}`;
    const existingIndex = groupIndexByKey.get(groupKey);
    const timeWindowViewModel: ListModeTimeWindowViewModel = {
      entry,
      timeLabel: formatTimeWindowTimeLabel(entry.timeWindow, index),
    };

    if (existingIndex !== undefined) {
      groups[existingIndex]?.timeWindows.push(timeWindowViewModel);
      return;
    }

    const groupLabel =
      groupKey.startsWith("time-window:")
        ? formatTimeWindowLabel(entry.timeWindow, index)
        : formatDateKeyLabel(groupKey as ProductLocalDateKey);

    groupIndexByKey.set(groupKey, groups.length);
    groups.push({
      key: groupKey,
      label: groupLabel,
      tabClass: isEndedTimeWindow(entry.timeWindow)
        ? "tab-bar__tab--expired"
        : undefined,
      timeWindows: [timeWindowViewModel],
    });
  });

  return groups.map((group) => ({
    ...group,
    tabClass: group.timeWindows.every(({ entry }) =>
      isEndedTimeWindow(entry.timeWindow),
    )
      ? "tab-bar__tab--expired"
      : undefined,
  }));
});

const dateTabs = computed(() =>
  dateGroups.value.map((group) => ({
    key: group.key,
    label: group.label,
    tabClass: group.tabClass,
  })),
);

const listModeCreateTimeWindowChoices = computed<ListModeCreateTimeWindowChoice[]>(
  () =>
    upcomingSortedCreateTimeWindows.value.map((entry, index) => ({
      entry,
      optionLabel: formatTimeWindowOptionLabel(entry, index),
      subtitleLabel: formatTimeWindowLabel(entry.timeWindow, index),
    })),
);

const selectedDateGroup = computed(
  () =>
    dateGroups.value.find((group) => group.key === selectedDateKey.value) ??
    null,
);

const resolveDefaultDateKey = (
  groups: ListModeDateGroupViewModel[],
): string | null => {
  const firstUpcomingGroup = groups.find((group) =>
    group.timeWindows.some(({ entry }) => !isEndedTimeWindow(entry.timeWindow)),
  );
  if (firstUpcomingGroup) {
    return firstUpcomingGroup.key;
  }

  return groups[0]?.key ?? null;
};

watch(
  dateGroups,
  (groups) => {
    if (groups.length === 0) {
      selectedDateKey.value = null;
      return;
    }

    if (selectedDateKey.value !== null) {
      const matched = groups.some((group) => group.key === selectedDateKey.value);
      if (matched) {
        return;
      }
    }

    selectedDateKey.value = resolveDefaultDateKey(groups);
  },
  { immediate: true },
);

const allPoiIdsCsv = computed(() => {
  const uniqueLocationIds = new Set<string>();

  for (const entry of sortedBrowseTimeWindows.value) {
    for (const pr of entry.prs) {
      const location = pr.location?.trim() ?? "";
      if (location.length > 0) {
        uniqueLocationIds.add(location);
      }
    }
  }

  if (uniqueLocationIds.size === 0) {
    return null;
  }

  return Array.from(uniqueLocationIds).join(",");
});

const { data: eventPois } = usePoisByIds(allPoiIdsCsv);
const poiGalleryById = computed(() => toPoiGalleryMap(eventPois.value ?? []));

const resolveCoverImage = (location: string | null): string | null => {
  if (!location) {
    return null;
  }

  const normalized = location.trim();
  if (!normalized) {
    return null;
  }

  return pickRandomPoiGalleryImage(poiGalleryById.value.get(normalized) ?? []);
};

const allDemandCards = computed(() =>
  toDemandCardViewModels({
    cards: demandCards.value ?? [],
    eventCoverImage: detail.value?.coverImage ?? null,
    resolveCoverImage,
  }),
);

const processedCardKeySet = computed(() => new Set(processedCardKeys.value));

const remainingDemandCards = computed(() =>
  allDemandCards.value.filter(
    (card) => !processedCardKeySet.value.has(card.cardKey),
  ),
);

const activeDemandCard = computed(() => remainingDemandCards.value[0] ?? null);
const stackPreviewCards = computed(() =>
  remainingDemandCards.value.slice(1, 3),
);
const isCardStageActive = computed(
  () => viewMode.value === "CARD" && activeDemandCard.value !== null,
);

watch(activeDemandCard, () => {
  cardActionError.value = null;
});

watch(
  isCardStageActive,
  (isActive, wasActive) => {
    syncCardOverflowGuard(isActive);

    if (!isActive) {
      consumeCardDragHintWindow();
      return;
    }

    if (!wasActive) {
      scheduleCardDragHint();
    }
  },
  { immediate: true },
);

watch(
  prefersReducedMotion,
  (reduced) => {
    if (reduced) {
      consumeCardDragHintWindow();
      return;
    }

    if (isCardStageActive.value) {
      scheduleCardDragHint();
    }
  },
  { immediate: false },
);

onUnmounted(() => {
  consumeCardDragHintWindow();
  syncCardOverflowGuard(false);
});

const markCardProcessed = (cardKey: string) => {
  if (processedCardKeySet.value.has(cardKey)) {
    return;
  }

  processedCardKeys.value = [...processedCardKeys.value, cardKey];
};

const handleSkipActiveCard = () => {
  const card = activeDemandCard.value;
  if (!card) {
    return;
  }

  consumeCardDragHintWindow();
  markCardProcessed(card.cardKey);
  cardActionError.value = null;
};

const handleViewActiveCardDetail = async () => {
  const card = activeDemandCard.value;
  if (!card || card.detailPrId === null) {
    return;
  }

  consumeCardDragHintWindow();
  cardActionError.value = null;
  isCardRouting.value = true;
  try {
    await router.push(prDetailPath(card.detailPrId));
  } catch (error) {
    cardActionError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  } finally {
    isCardRouting.value = false;
  }
};

const WECHAT_AUTH_BLOCKING_CODES = new Set([
  "WECHAT_AUTH_REQUIRED",
  "WECHAT_BIND_REQUIRED",
]);

const isWeChatAuthBlockingError = (
  error: unknown,
): error is CreateEventAssistedPRError => {
  if (!(error instanceof Error)) {
    return false;
  }
  const apiError = error as CreateEventAssistedPRError;
  return (
    apiError.status === 401 &&
    typeof apiError.code === "string" &&
    WECHAT_AUTH_BLOCKING_CODES.has(apiError.code)
  );
};

const buildEventAssistedFields = ({
  targetTimeWindow,
  locationId,
}: {
  targetTimeWindow: TimeWindow | null;
  locationId: string | null;
}) => {
  const event = detail.value;
  if (!event) {
    throw new Error(t("common.operationFailed"));
  }

  const normalizedLocation = locationId?.trim() ?? "";
  if (!targetTimeWindow || normalizedLocation.length === 0) {
    throw new Error(t("common.operationFailed"));
  }

  return {
    title: undefined,
    type: event.type,
    time: targetTimeWindow,
    location: normalizedLocation,
    minPartners: event.defaultMinPartners ?? 2,
    maxPartners: event.defaultMaxPartners ?? null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
  };
};

const createEventAssistedPR = async ({
  targetTimeWindow,
  locationId,
}: {
  targetTimeWindow: TimeWindow | null;
  locationId: string | null;
}) => {
  createEventAssistedPRMutation.reset();

  const event = detail.value;
  if (!event) {
    return;
  }

  const fields = buildEventAssistedFields({
    targetTimeWindow,
    locationId,
  });

  try {
    const created = await createEventAssistedPRMutation.mutateAsync({
      eventId: event.id,
      fields,
    });
    await router.push(`${created.canonicalPath}?entry=create&fromEvent=${event.id}`);
  } catch (error) {
    if (isWeChatAuthBlockingError(error)) {
      return;
    }
    throw error;
  }
};

const pendingCreateReplayRunning = ref(false);

const attemptPendingCreateReplay = async () => {
  if (pendingCreateReplayRunning.value) return;
  const event = detail.value;
  if (!event) return;

  const pending = readPendingWeChatAction();
  if (
    !pending ||
    pending.kind !== "EVENT_ASSISTED_PR_CREATE" ||
    pending.eventId !== event.id
  ) {
    return;
  }

  pendingCreateReplayRunning.value = true;
  clearPendingWeChatAction();
  try {
    const created = await createEventAssistedPRMutation.mutateAsync({
      eventId: event.id,
      fields: {
        title: undefined,
        type: pending.fields.type,
        time: pending.fields.time,
        location: pending.fields.location,
        minPartners: pending.fields.minPartners,
        maxPartners: pending.fields.maxPartners,
        partners: [],
        budget: null,
        preferences: [],
        notes: null,
      },
    });
    await router.push(`${created.canonicalPath}?entry=create&fromEvent=${event.id}`);
  } catch (error) {
    if (!isWeChatAuthBlockingError(error)) {
      const apiError = error as ApiError;
      cardActionError.value = apiError.message ?? t("common.operationFailed");
    }
  } finally {
    pendingCreateReplayRunning.value = false;
  }
};

watch(
  () => detail.value?.id ?? null,
  () => {
    void attemptPendingCreateReplay();
  },
  { immediate: true },
);

onMounted(() => {
  void attemptPendingCreateReplay();
});

const handleCreateInList = async ({
  timeWindow,
  locationId,
}: {
  timeWindow: TimeWindow | null;
  locationId: string | null;
}) => {
  await createEventAssistedPR({
    targetTimeWindow: timeWindow,
    locationId,
  });
};

const cardCreateTimeWindowOptions = computed<CardTimeWindowOption[]>(() =>
  upcomingSortedCreateTimeWindows.value.map((entry, index) => ({
    key: entry.key,
    label: formatTimeWindowOptionLabel(entry, index),
  })),
);

const resolveFirstCreatableTimeWindowKey = (): string | null => {
  for (const entry of upcomingSortedCreateTimeWindows.value) {
    if (entry.locationOptions.some((option) => !option.disabled)) {
      return entry.key;
    }
  }

  return upcomingSortedCreateTimeWindows.value[0]?.key ?? null;
};

watch(
  upcomingSortedCreateTimeWindows,
  (timeWindows) => {
    if (timeWindows.length === 0) {
      cardCreateTimeWindowKey.value = null;
      return;
    }

    const current = timeWindows.find(
      (entry) => entry.key === cardCreateTimeWindowKey.value,
    );
    if (current) {
      return;
    }

    cardCreateTimeWindowKey.value = resolveFirstCreatableTimeWindowKey();
  },
  { immediate: true },
);

const selectedCardCreateTimeWindow = computed(() => {
  const key = cardCreateTimeWindowKey.value;
  if (key === null) {
    return null;
  }

  return (
    upcomingSortedCreateTimeWindows.value.find((entry) => entry.key === key) ??
    null
  );
});

const cardCreateLocationOptions = computed<LocationOption[]>(() => {
  return selectedCardCreateTimeWindow.value?.locationOptions ?? [];
});

const cardCreateLocationOptionViewModels = computed<
  CardCreateLocationOptionViewModel[]
>(() =>
  cardCreateLocationOptions.value.map((option) => ({
    locationId: option.locationId,
    label: formatLocationOptionLabel(option),
    disabled: option.disabled,
  })),
);

watch(
  cardCreateLocationOptions,
  (options) => {
    if (
      cardCreateLocationId.value.length > 0 &&
      options.some(
        (option) =>
          option.locationId === cardCreateLocationId.value && !option.disabled,
      )
    ) {
      return;
    }

    const firstAvailable = options.find((option) => !option.disabled);
    cardCreateLocationId.value = firstAvailable?.locationId ?? "";
  },
  { immediate: true, deep: true },
);

const handleCreateFromCardEmpty = async () => {
  await createEventAssistedPR({
    targetTimeWindow: selectedCardCreateTimeWindow.value?.timeWindow ?? null,
    locationId: cardCreateLocationId.value || null,
  });
};

const formatLocationOptionLabel = (option: LocationOption): string => {
  if (option.disabled && option.disabledReason === "MAX_REACHED") {
    return t("anchorEvent.createCard.optionMaxReached", {
      locationId: option.locationId,
    });
  }

  return t("anchorEvent.createCard.optionRemaining", {
    locationId: option.locationId,
    count: option.remainingQuota,
  });
};
</script>

<style lang="scss" scoped>
:global(html.anchor-event-card-overflow-guard),
:global(body.anchor-event-card-overflow-guard) {
  overflow-x: clip;
}

.anchor-event-page {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.anchor-event-page__header,
.exhausted-banner {
  flex-shrink: 0;
}

.view-mode-switch {
  display: inline-flex;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: 999px;
  overflow: hidden;
}

.view-mode-switch__button {
  @include mx.pu-font(label-medium);
  border: none;
  min-height: 44px;
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  background: transparent;
  color: var(--sys-color-on-surface-variant);
  cursor: pointer;
}

.view-mode-switch__button--active {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.exhausted-banner {
  margin-top: 1.5rem;
  padding: 1rem;
  border-radius: 12px;
  background: var(--sys-color-surface-container-high);
  text-align: center;
}

.exhausted-text {
  font-weight: 600;
  margin-bottom: 0.25rem;
}

.exhausted-hint {
  font-size: 0.8125rem;
  color: var(--sys-color-on-surface-variant);
  margin-bottom: 0.75rem;
}

.discover-btn {
  display: inline-block;
  padding: 0.5rem 1.25rem;
  border-radius: 999px;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  text-decoration: none;
  font-size: 0.875rem;
}

.loading-state,
.error-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
