<template>
  <FooterRevealPageScaffold
    class="anchor-event-landing-page"
    data-page="event-landing"
    :content-placement="pageStatePlacement"
  >
    <template #header>
      <PageHeader
        v-if="detail"
        class="anchor-event-landing-page__header"
        :title="detail.title"
        :subtitle="detail.description ?? undefined"
        :back-fallback-to="{ name: 'event-plaza' }"
        @back="handleLandingBack"
      >
        <template #top-actions>
          <Button
            v-if="resolvedMode === 'FORM'"
            appearance="pill"
            tone="outline"
            size="sm"
            type="button"
            @click="showOtherEventsDrawer = true"
          >
            {{ t("anchorEvent.otherEvents.action") }}
          </Button>
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

    <AnchorEventFormModeSurface
      v-else-if="resolvedMode === 'FORM' && eventId !== null"
      ref="formModeSurfaceRef"
      :event-id="eventId"
      @result-state-change="formModeResultState = $event"
    />

    <template v-else-if="detail">
      <AnchorEventCardModeSurface
        :active-demand-card="activeDemandCard"
        :stack-preview-cards="stackPreviewCards"
        :is-card-routing="isCardRouting"
        :card-action-error="cardActionError"
        :drag-hint-token="0"
        :card-create-time-window-options="cardCreateTimeWindowOptions"
        :card-create-time-window-key="cardCreateTimeWindowKey"
        :card-create-location-id="cardCreateLocationId"
        :card-create-location-options="cardCreateLocationOptionViewModels"
        :create-action-error-message="createActionErrorMessage"
        :is-create-pending="isCreatePending"
        :event-id="detail.id"
        :event-title="detail.title"
        :event-beta-group-qr-code="detail.betaGroupQrCode"
        @consume-drag-hint-window="noop"
        @skip-active-card="handleSkipActiveCard"
        @view-active-card-detail="handleViewActiveCardDetail"
        @update:card-create-time-window-key="cardCreateTimeWindowKey = $event"
        @update:card-create-location-id="cardCreateLocationId = $event"
        @create-from-card-empty="handleCreateFromCardEmpty"
      />
    </template>

    <template #footer>
      <FullCommonFooter />
    </template>
  </FooterRevealPageScaffold>

  <BottomDrawer
    :open="showOtherEventsDrawer"
    :title="t('anchorEvent.otherEvents.title')"
    @close="showOtherEventsDrawer = false"
  >
    <LoadingIndicator
      v-if="otherEventsQuery.isLoading.value"
      :message="t('common.loading')"
    />
    <div v-else-if="otherEventsQuery.error.value" class="error-state">
      {{ t("anchorEvent.formMode.otherEventsLoadFailed") }}
    </div>
    <AnchorEventRadioCardCarousel
      v-else
      :model-value="selectedOtherEventId"
      :events="otherEventCandidates"
      :aria-label="t('anchorEvent.otherEvents.title')"
      @update:model-value="handleSelectOtherEvent"
    />
  </BottomDrawer>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter, type RouteLocationRaw } from "vue-router";
import { useI18n } from "vue-i18n";
import FullCommonFooter from "@/domains/landing/ui/sections/FullCommonFooter.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import FooterRevealPageScaffold from "@/shared/ui/layout/FooterRevealPageScaffold.vue";
import AnchorEventCardModeSurface from "@/domains/event/ui/surfaces/AnchorEventCardModeSurface.vue";
import AnchorEventFormModeSurface from "@/domains/event/ui/surfaces/AnchorEventFormModeSurface.vue";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";
import { useAnchorEventDemandCards } from "@/domains/event/queries/useAnchorEventDemandCards";
import { useAnchorEvents } from "@/domains/event/queries/useAnchorEvents";
import { useResolvedAnchorEventLandingMode } from "@/domains/event/use-cases/useResolvedAnchorEventLandingMode";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";
import { toDemandCardViewModels } from "@/domains/event/model/demand-cards";
import {
  pickRandomPoiGalleryImage,
  toPoiGalleryMap,
} from "@/domains/event/model/poi-gallery";
import { prDetailPath } from "@/domains/pr/routing/routes";
import type { ApiError } from "@/shared/api/error";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";
import Button from "@/shared/ui/actions/Button.vue";
import BottomDrawer from "@/shared/ui/overlay/BottomDrawer.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import AnchorEventRadioCardCarousel from "@/domains/event/ui/composites/AnchorEventRadioCardCarousel.vue";

type TimeWindow = [string | null, string | null];
type LocationOption =
  AnchorEventDetailResponse["createTimeWindows"][number]["locationOptions"][number];
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
type FormModeResultState = "selection" | "no-match";
type FormModeSurfaceExposed = {
  returnToSelection: () => void;
};
type RouterHistoryState = {
  back?: string | null;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const showOtherEventsDrawer = ref(false);
const formModeSurfaceRef = ref<FormModeSurfaceExposed | null>(null);
const formModeResultState = ref<FormModeResultState>("selection");

const noop = () => undefined;

const eventId = computed(() => {
  const raw = route.params.eventId;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const { assignmentQuery, resolvedMode, isTimeoutFallback } =
  useResolvedAnchorEventLandingMode(eventId);
const { data: detail, isLoading: isDetailLoading, isError: isDetailError } =
  useAnchorEventDetail(eventId);
const otherEventsQuery = useAnchorEvents();
const selectedOtherEventId = computed(() => eventId.value);
const otherEventCandidates = computed(() =>
  (otherEventsQuery.data.value ?? []).filter(
    (item) => item.id !== null && item.id !== eventId.value,
  ),
);

const isCardRichMode = computed(() => resolvedMode.value === "CARD_RICH");

const {
  data: demandCards,
  isLoading: isDemandCardsLoading,
  isError: isDemandCardsError,
} = useAnchorEventDemandCards(eventId, isCardRichMode);

const isModePending = computed(
  () => resolvedMode.value === null && assignmentQuery.isLoading.value,
);

const isLoading = computed(() => {
  if (eventId.value === null) {
    return false;
  }

  if (isModePending.value) {
    return true;
  }

  if (resolvedMode.value === "CARD_RICH") {
    return isDetailLoading.value || isDemandCardsLoading.value;
  }

  return false;
});

const isError = computed(() => {
  if (eventId.value === null) {
    return true;
  }

  const assignmentError = assignmentQuery.error.value;
  if (assignmentError && !isTimeoutFallback.value) {
    return true;
  }

  if (isDetailError.value) {
    return true;
  }

  if (resolvedMode.value === "CARD_RICH" && isDemandCardsError.value) {
    return true;
  }

  return false;
});

const pageStatePlacement = computed(() =>
  isLoading.value || isError.value ? "center" : "start",
);

const hasRouterBackEntry = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }

  const historyState = window.history.state as RouterHistoryState | null;
  return typeof historyState?.back === "string" && historyState.back.length > 0;
};

const backFallbackTo: RouteLocationRaw = { name: "event-plaza" };

const handleLandingBack = async () => {
  if (resolvedMode.value === "FORM" && formModeResultState.value === "no-match") {
    formModeSurfaceRef.value?.returnToSelection();
    return;
  }

  if (hasRouterBackEntry()) {
    router.back();
    return;
  }

  await router.replace(backFallbackTo);
};

watch([eventId, resolvedMode], () => {
  formModeResultState.value = "selection";
});

const createEventAssistedPRMutation = useCreateEventAssistedPR();
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
  return Number.isFinite(timestamp) ? timestamp : Number.POSITIVE_INFINITY;
};

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

const upcomingSortedCreateTimeWindows = computed(() =>
  sortedCreateTimeWindows.value.filter(
    (entry) => !hasTimeWindowStarted(entry.timeWindow),
  ),
);

const productLocalTimeFormatter = new Intl.DateTimeFormat("zh-CN", {
  timeZone: "Asia/Shanghai",
  month: "numeric",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const formatTimeWindowLabel = (
  entry: CreateTimeWindowEntry,
  index: number,
): string => {
  const [start] = entry.timeWindow;
  if (!start) {
    return `${t("anchorEvent.batchLabel")} ${index + 1}`;
  }

  const date = new Date(start);
  if (Number.isNaN(date.getTime())) {
    return `${t("anchorEvent.batchLabel")} ${index + 1}`;
  }

  return productLocalTimeFormatter.format(date);
};

const cardCreateTimeWindowKey = ref<string | null>(null);
const cardCreateLocationId = ref("");

const cardCreateTimeWindowOptions = computed<CardTimeWindowOption[]>(() =>
  upcomingSortedCreateTimeWindows.value.map((entry, index) => ({
    key: entry.key,
    label: formatTimeWindowLabel(entry, index),
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

const allPoiIdsCsv = computed(() => {
  const uniqueLocationIds = new Set<string>();

  for (const card of demandCards.value ?? []) {
    const location = card.displayLocationName?.trim() ?? "";
    if (location.length > 0) {
      uniqueLocationIds.add(location);
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

const processedCardKeys = ref<string[]>([]);
const processedCardKeySet = computed(() => new Set(processedCardKeys.value));
const remainingDemandCards = computed(() =>
  allDemandCards.value.filter(
    (card) => !processedCardKeySet.value.has(card.cardKey),
  ),
);
const activeDemandCard = computed(() => remainingDemandCards.value[0] ?? null);
const stackPreviewCards = computed(() => remainingDemandCards.value.slice(1, 3));

const cardActionError = ref<string | null>(null);
const isCardRouting = ref(false);

watch(activeDemandCard, () => {
  cardActionError.value = null;
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

  markCardProcessed(card.cardKey);
  cardActionError.value = null;
};

const handleViewActiveCardDetail = async () => {
  const card = activeDemandCard.value;
  if (!card || card.detailPrId === null) {
    return;
  }

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
    await router.push(
      `${created.canonicalPath}?entry=create&fromEvent=${event.id}`,
    );
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
        preferences: pending.fields.preferences,
        notes: null,
      },
    });
    await router.push(
      `${created.canonicalPath}?entry=create&fromEvent=${event.id}`,
    );
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

const handleCreateFromCardEmpty = async () => {
  await createEventAssistedPR({
    targetTimeWindow: selectedCardCreateTimeWindow.value?.timeWindow ?? null,
    locationId: cardCreateLocationId.value || null,
  });
};

const handleSelectOtherEvent = async (nextEventId: number | null) => {
  if (nextEventId === null || nextEventId === eventId.value) {
    return;
  }
  showOtherEventsDrawer.value = false;
  await router.push({
    name: "anchor-event-landing",
    params: {
      eventId: nextEventId.toString(),
    },
  });
};
</script>

<style lang="scss" scoped>
.anchor-event-landing-page {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.anchor-event-landing-page__header {
  flex-shrink: 0;
}

.loading-state,
.error-state {
  text-align: center;
  color: var(--sys-color-on-surface-variant);
}

.back-link {
  display: inline-block;
  margin-top: 0.75rem;
  color: var(--sys-color-primary);
}
</style>
