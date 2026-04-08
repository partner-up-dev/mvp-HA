<template>
  <PageScaffold
    :class="[
      'anchor-event-page',
      { 'anchor-event-page--card-active': isCardStageActive },
    ]"
    data-page="event-detail"
  >
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
      <PageHeader
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
              @click="viewMode = 'CARD'"
            >
              {{ t("anchorEvent.viewMode.card") }}
            </button>
            <button
              type="button"
              class="view-mode-switch__button"
              :class="{
                'view-mode-switch__button--active': viewMode === 'LIST',
              }"
              @click="viewMode = 'LIST'"
            >
              {{ t("anchorEvent.viewMode.list") }}
            </button>
          </div>
        </template>
      </PageHeader>

      <template v-if="viewMode === 'CARD'">
        <div
          v-if="activeDemandCard"
          class="card-mode"
          data-region="anchor-pr-list"
        >
          <div class="card-stage">
            <div class="card-stage__inner">
              <AnchorEventDemandCard
                v-for="(previewCard, previewIndex) in stackPreviewCards"
                :key="`preview-${previewCard.cardKey}`"
                class="card-stack-preview"
                :style="{
                  zIndex: 2 - previewIndex,
                  animationDelay: `${70 + previewIndex * 40}ms`,
                }"
                :display-location-name="previewCard.displayLocationName"
                :time-label="previewCard.timeLabel"
                :preference-tags="previewCard.preferenceTags"
                :notes="previewCard.notes"
                :cover-image="previewCard.coverImage"
                :detail-pr-id="previewCard.detailPrId"
                :preview="true"
                :preview-depth="previewIndex + 1"
                aria-hidden="true"
              />

              <div
                :key="`front-${activeDemandCard.cardKey}`"
                class="card-stage__front-shell"
              >
                <AnchorEventDemandCard
                  class="card-stage__front"
                  :display-location-name="activeDemandCard.displayLocationName"
                  :time-label="activeDemandCard.timeLabel"
                  :preference-tags="activeDemandCard.preferenceTags"
                  :notes="activeDemandCard.notes"
                  :cover-image="activeDemandCard.coverImage"
                  :detail-pr-id="activeDemandCard.detailPrId"
                  :pending="isCardRouting"
                  @skip="handleSkipActiveCard"
                  @view-detail="handleViewActiveCardDetail"
                />
              </div>
            </div>
          </div>

          <div class="card-mode__actions">
            <button
              type="button"
              class="card-mode__action card-mode__action--skip"
              :disabled="isCardRouting"
              @click="handleSkipActiveCard"
            >
              {{ t("anchorEvent.card.skipButton") }}
            </button>
            <button
              type="button"
              class="card-mode__action card-mode__action--detail"
              :disabled="isCardRouting || activeDemandCard.detailPrId === null"
              @click="handleViewActiveCardDetail"
            >
              {{ t("anchorEvent.card.detailButton") }}
            </button>
          </div>

          <p v-if="cardActionError" class="card-mode__error">
            {{ cardActionError }}
          </p>
        </div>

        <div v-else class="card-empty">
          <p class="card-empty__title">
            {{ t("anchorEvent.card.emptyTitle") }}
          </p>
          <p class="card-empty__subtitle">
            {{ t("anchorEvent.card.emptySubtitle") }}
          </p>

          <div class="card-empty__create" data-region="create-anchor-pr">
            <label
              v-if="cardCreateBatchOptions.length > 0"
              class="card-empty__field"
            >
              <span class="card-empty__label">{{
                t("anchorEvent.card.batchLabel")
              }}</span>
              <select
                v-model.number="cardCreateBatchId"
                class="card-empty__input"
              >
                <option
                  v-for="option in cardCreateBatchOptions"
                  :key="option.batchId"
                  :value="option.batchId"
                >
                  {{ option.label }}
                </option>
              </select>
            </label>

            <label
              v-if="cardCreateBatchOptions.length > 0"
              class="card-empty__field"
            >
              <span class="card-empty__label">{{
                t("anchorEvent.createCard.locationLabel")
              }}</span>
              <select v-model="cardCreateLocationId" class="card-empty__input">
                <option
                  v-for="option in cardCreateLocationOptions"
                  :key="option.locationId"
                  :value="option.locationId"
                  :disabled="option.disabled"
                >
                  {{ formatLocationOptionLabel(option) }}
                </option>
              </select>
            </label>

            <p v-if="createActionErrorMessage" class="card-empty__error">
              {{ createActionErrorMessage }}
            </p>

            <button
              type="button"
              class="card-empty__action"
              :disabled="isCreatePending"
              @click="handleCreateFromCardEmpty"
            >
              {{
                isCreatePending
                  ? t("anchorEvent.createCard.creatingAction")
                  : t("anchorEvent.createCard.createAction")
              }}
            </button>

            <AnchorEventBetaGroupEntry class="card-empty__beta-group" />
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="detail.batches.length > 0" class="batch-section">
          <TabBar
            :items="batchTabs"
            :model-value="selectedBatchId ?? -1"
            :aria-label="t('anchorEvent.batchLabel')"
            @update:model-value="handleBatchTabChange"
          />

          <div v-if="selectedBatch" class="batch-content" role="tabpanel">
            <div v-if="selectedBatch.prs.length === 0" class="empty-batch">
              {{ t("anchorEvent.noPRsInBatch") }}
            </div>
            <div class="pr-list" data-region="anchor-pr-list">
              <AnchorEventPRCard
                v-for="pr in selectedBatch.prs"
                :key="pr.id"
                :pr="pr"
                :cover-image="resolveCoverImage(pr.location)"
              />
              <AnchorPRCreateCard
                :location-options="selectedBatch.locationOptions"
                :pending="isCreatePending"
                :error-message="createActionErrorMessage"
                @create="handleCreateInList"
                data-region="create-anchor-pr"
              />
            </div>
          </div>
        </div>

        <div v-else class="empty-state">
          {{ t("anchorEvent.noBatches") }}
        </div>
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
  </PageScaffold>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import TabBar from "@/shared/ui/navigation/TabBar.vue";
import AnchorEventPRCard from "@/domains/event/ui/primitives/AnchorEventPRCard.vue";
import AnchorPRCreateCard from "@/domains/event/ui/primitives/AnchorPRCreateCard.vue";
import AnchorEventBetaGroupEntry from "@/domains/event/ui/primitives/AnchorEventBetaGroupEntry.vue";
import AnchorEventDemandCard from "@/domains/event/ui/primitives/AnchorEventDemandCard.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";
import {
  useCreateUserAnchorPR,
  type CreateUserAnchorPRError,
} from "@/domains/event/queries/useCreateUserAnchorPR";
import {
  useCreateCommunityPRFromStructured,
  usePublishCommunityPR,
} from "@/domains/pr/queries/useCommunityPR";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";
import {
  anchorPRDetailPath,
  communityPRDetailPath,
} from "@/domains/pr/routing/routes";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";
import {
  pickRandomPoiGalleryImage,
  toPoiGalleryMap,
} from "@/domains/event/model/poi-gallery";
import type { ApiError } from "@/shared/api/error";
import {
  clearPendingWeChatAction,
  readPendingWeChatAction,
} from "@/processes/wechat/pending-wechat-action";

type EventViewMode = "LIST" | "CARD";
type TimeWindow = [string | null, string | null];

type LocationOption =
  AnchorEventDetailResponse["batches"][number]["locationOptions"][number];

type CardBatchOption = {
  batchId: number;
  label: string;
};

type DemandCardCandidate = {
  prId: number;
  status: string;
  createdAt: string;
  notes: string | null;
};

type DemandCardViewModel = {
  cardKey: string;
  batchId: number;
  timeWindow: TimeWindow;
  batchStartTimestamp: number;
  timeLabel: string;
  displayLocationName: string;
  preferenceFingerprint: string | null;
  preferenceTags: string[];
  notes: string | null;
  candidates: DemandCardCandidate[];
  detailPrId: number | null;
  coverImage: string | null;
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();

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
const selectedBatchId = ref<number | null>(null);
const processedCardKeys = ref<string[]>([]);
const cardActionError = ref<string | null>(null);
const isCardRouting = ref(false);

const cardCreateBatchId = ref<number | null>(null);
const cardCreateLocationId = ref("");

const eventId = computed(() => {
  const raw = route.params.eventId;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
});

watch(
  [eventId, () => route.query.mode],
  () => {
    viewMode.value = resolveInitialViewMode();
  },
  { immediate: true },
);

const { data: detail, isLoading, isError } = useAnchorEventDetail(eventId);
const createUserAnchorPRMutation = useCreateUserAnchorPR();
const createCommunityPRMutation = useCreateCommunityPRFromStructured();
const publishCommunityPRMutation = usePublishCommunityPR();
const userSessionStore = useUserSessionStore();

const isCreatePending = computed(
  () =>
    createUserAnchorPRMutation.isPending.value ||
    createCommunityPRMutation.isPending.value ||
    publishCommunityPRMutation.isPending.value,
);

const JOIN_TIME_WINDOW_CONFLICT_CODE = "JOIN_TIME_WINDOW_CONFLICT";
const createActionErrorMessage = computed(() => {
  const createAnchorError = createUserAnchorPRMutation.error
    .value as CreateUserAnchorPRError | null;
  if (createAnchorError) {
    switch (createAnchorError.code) {
      case JOIN_TIME_WINDOW_CONFLICT_CODE:
        return t("anchorEvent.createCard.errors.timeWindowConflict");
      case "WECHAT_AUTH_REQUIRED":
        return t("anchorEvent.createCard.errors.wechatAuthRequired");
      case "WECHAT_OAUTH_NOT_CONFIGURED":
        return t("anchorEvent.createCard.errors.wechatOAuthNotConfigured");
      case "LOCATION_CAP_REACHED":
        return t("anchorEvent.createCard.errors.locationCapReached");
      case "ANCHOR_EVENT_NOT_FOUND":
      case "ANCHOR_EVENT_BATCH_NOT_FOUND":
        return t("anchorEvent.createCard.errors.eventUnavailable");
      default:
        return t("anchorEvent.createCard.errors.createFailed");
    }
  }

  return (
    createCommunityPRMutation.error.value?.message ??
    publishCommunityPRMutation.error.value?.message ??
    null
  );
});

const resolveBatchStartTimestamp = (timeWindow: TimeWindow): number => {
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

const sortedBatches = computed(() => {
  const batches = detail.value?.batches ?? [];
  return [...batches].sort((left, right) => {
    const leftTimestamp = resolveBatchStartTimestamp(left.timeWindow);
    const rightTimestamp = resolveBatchStartTimestamp(right.timeWindow);
    return leftTimestamp - rightTimestamp;
  });
});

const isExpiredBatch = (
  batch: AnchorEventDetailResponse["batches"][number],
): boolean => batch.status === "EXPIRED";

function formatBatchLabel(timeWindow: TimeWindow, index: number): string {
  const [start] = timeWindow;
  if (start) {
    try {
      const date = new Date(start);
      if (Number.isNaN(date.getTime())) {
        return `${t("anchorEvent.batchLabel")} ${index + 1}`;
      }

      const datePart = date.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        weekday: "short",
      });
      const timePart = date.toLocaleTimeString("zh-CN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
      return `${datePart} ${timePart}`;
    } catch {
      return `${t("anchorEvent.batchLabel")} ${index + 1}`;
    }
  }

  return `${t("anchorEvent.batchLabel")} ${index + 1}`;
}

const batchTabs = computed(() =>
  sortedBatches.value.map((batch, index) => ({
    key: batch.id,
    label: formatBatchLabel(batch.timeWindow, index),
    tabClass: isExpiredBatch(batch) ? "tab-bar__tab--expired" : undefined,
  })),
);

const handleBatchTabChange = (value: string | number) => {
  if (typeof value !== "number") return;
  selectedBatchId.value = value;
};

const selectedBatch = computed(
  () =>
    sortedBatches.value.find((batch) => batch.id === selectedBatchId.value) ??
    null,
);

const resolveDefaultBatchId = (
  batches: AnchorEventDetailResponse["batches"],
): number | null => {
  const firstOpenBatch = batches.find((batch) => batch.status === "OPEN");
  if (firstOpenBatch) {
    return firstOpenBatch.id;
  }

  const firstNonExpiredBatch = batches.find((batch) => !isExpiredBatch(batch));
  if (firstNonExpiredBatch) {
    return firstNonExpiredBatch.id;
  }

  return batches[0]?.id ?? null;
};

watch(
  sortedBatches,
  (batches) => {
    if (batches.length === 0) {
      selectedBatchId.value = null;
      return;
    }

    if (selectedBatchId.value !== null) {
      const matched = batches.some(
        (batch) => batch.id === selectedBatchId.value,
      );
      if (matched) {
        return;
      }
    }

    selectedBatchId.value = resolveDefaultBatchId(batches);
  },
  { immediate: true },
);

const allPoiIdsCsv = computed(() => {
  const uniqueLocationIds = new Set<string>();

  for (const batch of sortedBatches.value) {
    for (const pr of batch.prs) {
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

  return pickRandomPoiGalleryImage(
    poiGalleryById.value.get(normalized) ?? [],
  );
};

const normalizeFingerprint = (value: string): string | null => {
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
};

const normalizePreferenceTag = (value: string): string | null => {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeCardNotes = (value: string | null | undefined): string | null => {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
};

const resolvePreferenceTags = (values: string[]): string[] => {
  const seen = new Set<string>();
  const tags: string[] = [];

  for (const value of values) {
    const tag = normalizePreferenceTag(value);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    tags.push(tag);
  }

  return tags;
};

const normalizeCardKeySegment = (value: string): string =>
  value.trim().replace(/\s+/g, " ").toLowerCase();

const buildDemandCardKey = (
  batchId: number,
  displayLocationName: string,
  preferenceFingerprint: string | null,
): string => {
  const locationSegment = normalizeCardKeySegment(displayLocationName);
  const preferenceSegment = preferenceFingerprint
    ? normalizeCardKeySegment(preferenceFingerprint)
    : "_";
  return `${batchId}::${locationSegment}::${preferenceSegment}`;
};

const buildDemandCards = (
  batches: AnchorEventDetailResponse["batches"],
  eventCoverImage: string | null,
): DemandCardViewModel[] => {
  const cardMap = new Map<string, DemandCardViewModel>();

  batches.forEach((batch, batchIndex) => {
    const timeLabel = formatBatchLabel(batch.timeWindow, batchIndex);
    const batchStartTimestamp = resolveBatchStartTimestamp(batch.timeWindow);

    batch.prs.forEach((pr) => {
      const location = pr.location?.trim() ?? "";
      if (!location) {
        return;
      }

      const preferenceTags = resolvePreferenceTags(
        Array.isArray(pr.preferences) ? pr.preferences : [],
      );
      const preferenceFingerprint =
        preferenceTags.length > 0
          ? preferenceTags
              .map((tag) => normalizeFingerprint(tag))
              .filter((tag): tag is string => tag !== null)
              .sort()
              .join("|")
          : null;
      const cardKey = buildDemandCardKey(
        batch.id,
        location,
        preferenceFingerprint,
      );

      const candidate: DemandCardCandidate = {
        prId: pr.id,
        status: pr.status,
        createdAt: pr.createdAt,
        notes: normalizeCardNotes(pr.notes),
      };

      const existing = cardMap.get(cardKey);
      if (existing) {
        existing.candidates.push(candidate);
        return;
      }

      cardMap.set(cardKey, {
        cardKey,
        batchId: batch.id,
        timeWindow: batch.timeWindow,
        batchStartTimestamp,
        timeLabel,
        displayLocationName: location,
        preferenceFingerprint,
        preferenceTags,
        notes: candidate.notes,
        candidates: [candidate],
        detailPrId: pr.id,
        coverImage: null,
      });
    });
  });

  const cards = Array.from(cardMap.values()).map((card) => {
    const sortedCandidates = [...card.candidates].sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();

      const safeLeft = Number.isFinite(leftTime)
        ? leftTime
        : Number.POSITIVE_INFINITY;
      const safeRight = Number.isFinite(rightTime)
        ? rightTime
        : Number.POSITIVE_INFINITY;

      if (safeLeft !== safeRight) {
        return safeLeft - safeRight;
      }

      return left.prId - right.prId;
    });
    const representativeCandidate =
      sortedCandidates.find((candidate) => candidate.notes !== null) ??
      sortedCandidates[0] ??
      null;

    return {
      ...card,
      candidates: sortedCandidates,
      notes: representativeCandidate?.notes ?? null,
      detailPrId: representativeCandidate?.prId ?? null,
    };
  });

  cards.sort((left, right) => {
    if (left.batchStartTimestamp !== right.batchStartTimestamp) {
      return left.batchStartTimestamp - right.batchStartTimestamp;
    }

    return left.cardKey.localeCompare(right.cardKey);
  });

  return cards.map((card) => ({
    ...card,
    coverImage: resolveCoverImage(card.displayLocationName) ?? eventCoverImage,
  }));
};

const allDemandCards = computed(() => {
  const batches = sortedBatches.value.filter((batch) => !isExpiredBatch(batch));
  return buildDemandCards(batches, detail.value?.coverImage ?? null);
});

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
    await router.push(anchorPRDetailPath(card.detailPrId));
  } catch (error) {
    cardActionError.value =
      error instanceof Error ? error.message : t("common.operationFailed");
  } finally {
    isCardRouting.value = false;
  }
};

const APR_FALLBACK_STATUSES = new Set([400, 404, 409, 503]);
const APR_FALLBACK_CODES = new Set([
  "LOCATION_CAP_REACHED",
  "INVALID_LOCATION",
  "ANCHOR_EVENT_NOT_FOUND",
  "ANCHOR_EVENT_BATCH_NOT_FOUND",
  "WECHAT_OAUTH_NOT_CONFIGURED",
]);
const WECHAT_AUTH_BLOCKING_CODES = new Set([
  "WECHAT_AUTH_REQUIRED",
  "WECHAT_BIND_REQUIRED",
]);

const isWeChatAuthBlockingError = (
  error: unknown,
): error is CreateUserAnchorPRError => {
  if (!(error instanceof Error)) {
    return false;
  }
  const apiError = error as CreateUserAnchorPRError;
  return (
    apiError.status === 401 &&
    typeof apiError.code === "string" &&
    WECHAT_AUTH_BLOCKING_CODES.has(apiError.code)
  );
};

const shouldFallbackToCommunity = (
  error: unknown,
): error is CreateUserAnchorPRError => {
  if (!(error instanceof Error)) {
    return false;
  }

  const apiError = error as CreateUserAnchorPRError;
  if (typeof apiError.status !== "number") {
    return false;
  }
  if (!APR_FALLBACK_STATUSES.has(apiError.status)) {
    return false;
  }
  if (typeof apiError.code === "string") {
    return APR_FALLBACK_CODES.has(apiError.code);
  }

  return true;
};

const createCommunityPRFallback = async ({
  targetBatchId,
  locationId,
}: {
  targetBatchId: number | null;
  locationId: string | null;
}): Promise<string> => {
  const event = detail.value;
  if (!event) {
    throw new Error(t("common.operationFailed"));
  }

  const targetBatch =
    targetBatchId === null
      ? null
      : (sortedBatches.value.find((batch) => batch.id === targetBatchId) ??
        null);

  const normalizedLocation = locationId?.trim() ?? "";

  const draft = await createCommunityPRMutation.mutateAsync({
    fields: {
      title: undefined,
      type: event.type,
      time: targetBatch?.timeWindow ?? [null, null],
      location: normalizedLocation.length > 0 ? normalizedLocation : null,
      minPartners: 2,
      maxPartners: null,
      partners: [],
      budget: null,
      preferences: [],
      notes: "Created from Anchor Event fallback",
    },
  });

  const publishResult = await publishCommunityPRMutation.mutateAsync({
    id: draft.id,
  });

  if (publishResult.auth) {
    userSessionStore.applyAuthSession(publishResult.auth);
  }

  return communityPRDetailPath(draft.id);
};

const createPRWithFallback = async ({
  targetBatchId,
  locationId,
}: {
  targetBatchId: number | null;
  locationId: string | null;
}) => {
  createUserAnchorPRMutation.reset();
  createCommunityPRMutation.reset();
  publishCommunityPRMutation.reset();

  const event = detail.value;
  if (!event) {
    return;
  }

  const normalizedLocation = locationId?.trim() ?? "";
  if (targetBatchId === null || normalizedLocation.length === 0) {
    const fallbackPath = await createCommunityPRFallback({
      targetBatchId,
      locationId: normalizedLocation.length > 0 ? normalizedLocation : null,
    });
    createUserAnchorPRMutation.reset();
    await router.push(fallbackPath);
    return;
  }

  try {
    const created = await createUserAnchorPRMutation.mutateAsync({
      eventId: event.id,
      batchId: targetBatchId,
      locationId: normalizedLocation,
    });
    await router.push(created.canonicalPath);
  } catch (error) {
    if (isWeChatAuthBlockingError(error)) {
      return;
    }
    if (!shouldFallbackToCommunity(error)) {
      throw error;
    }

    const fallbackPath = await createCommunityPRFallback({
      targetBatchId,
      locationId: normalizedLocation,
    });
    createUserAnchorPRMutation.reset();
    await router.push(fallbackPath);
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
    pending.kind !== "ANCHOR_EVENT_CREATE" ||
    pending.eventId !== event.id
  ) {
    return;
  }

  pendingCreateReplayRunning.value = true;
  clearPendingWeChatAction();
  try {
    await createPRWithFallback({
      targetBatchId: pending.batchId,
      locationId: pending.locationId,
    });
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

const handleCreateInList = async (locationId: string | null) => {
  const batch = selectedBatch.value;
  await createPRWithFallback({
    targetBatchId: batch?.id ?? null,
    locationId,
  });
};

const cardCreateBatchOptions = computed<CardBatchOption[]>(() =>
  sortedBatches.value.map((batch, index) => ({
    batchId: batch.id,
    label: formatBatchLabel(batch.timeWindow, index),
  })),
);

const resolveFirstCreatableBatchId = (): number | null => {
  for (const batch of sortedBatches.value) {
    if (batch.locationOptions.some((option) => !option.disabled)) {
      return batch.id;
    }
  }

  return sortedBatches.value[0]?.id ?? null;
};

watch(
  sortedBatches,
  (batches) => {
    if (batches.length === 0) {
      cardCreateBatchId.value = null;
      return;
    }

    const current = batches.find(
      (batch) => batch.id === cardCreateBatchId.value,
    );
    if (current) {
      return;
    }

    cardCreateBatchId.value = resolveFirstCreatableBatchId();
  },
  { immediate: true },
);

const cardCreateBatch = computed(() => {
  const id = cardCreateBatchId.value;
  if (id === null) {
    return null;
  }

  return sortedBatches.value.find((batch) => batch.id === id) ?? null;
});

const cardCreateLocationOptions = computed<LocationOption[]>(() => {
  return cardCreateBatch.value?.locationOptions ?? [];
});

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
  await createPRWithFallback({
    targetBatchId: cardCreateBatchId.value,
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
.anchor-event-page--card-active {
  display: flex;
  flex-direction: column;
}

.anchor-event-page__header,
.card-mode__actions,
.card-mode__error,
.exhausted-banner {
  flex-shrink: 0;
}

.batch-section {
  margin-bottom: 1rem;
}

.batch-section :deep(.tab-bar) {
  margin-bottom: 1rem;
}

.pr-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
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

.card-mode {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  margin-left: calc(-1 * (var(--sys-spacing-med) + var(--pu-safe-left)));
  margin-right: calc(-1 * (var(--sys-spacing-med) + var(--pu-safe-right)));
}

.anchor-event-page--card-active .card-mode {
  flex: 1 1 auto;
  min-height: 0;
}

.card-stage {
  padding-inline-start: calc(var(--sys-spacing-med) + var(--pu-safe-left));
  padding-inline-end: calc(var(--sys-spacing-med) + var(--pu-safe-right));
}

.anchor-event-page--card-active .card-stage {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
}

.card-stage__inner {
  position: relative;
}

.anchor-event-page--card-active .card-stage__inner {
  flex: 1 1 auto;
  min-height: 0;
}

.card-stage__front-shell {
  position: absolute;
  inset: 0;
  z-index: 3;
  animation: card-front-promote 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.card-stage__front {
  z-index: 2;
}

.card-stack-preview {
  position: absolute;
  inset: 0;
  pointer-events: none;
  animation: card-preview-reveal 220ms ease-out both;
}

@keyframes card-front-promote {
  from {
    transform: translateY(14px) scale(0.972);
  }
  to {
    transform: translateY(0) scale(1);
  }
}

@keyframes card-preview-reveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.card-mode__error {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-error);
  padding-inline-start: calc(var(--sys-spacing-med) + var(--pu-safe-left));
  padding-inline-end: calc(var(--sys-spacing-med) + var(--pu-safe-right));
}

.card-mode__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-sm);
  padding-inline-start: calc(var(--sys-spacing-med) + var(--pu-safe-left));
  padding-inline-end: calc(var(--sys-spacing-med) + var(--pu-safe-right));
}

.card-mode__action {
  @include mx.pu-pill-action(outline-transparent, default);
  border: none;
  cursor: pointer;
  min-height: 48px;
}

.card-mode__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.card-mode__action--detail {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  border-color: var(--sys-color-primary);
}

.card-mode__action--skip {
  color: var(--sys-color-error);
  border-color: var(--sys-color-error);
}

.card-empty {
  padding: 1rem;
  border-radius: var(--sys-radius-lg);
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.card-empty__title {
  @include mx.pu-font(title-medium);
  margin: 0;
  color: var(--sys-color-on-surface);
}

.card-empty__subtitle {
  @include mx.pu-font(body-small);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.card-empty__create {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.card-empty__field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.card-empty__label {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
}

.card-empty__input {
  @include mx.pu-field-shell(compact-surface);
  min-height: var(--sys-size-large);
}

.card-empty__error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}

.card-empty__action {
  @include mx.pu-pill-action(solid-primary, small);
  border: none;
  cursor: pointer;
}

.card-empty__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.card-empty__beta-group {
  margin-top: var(--sys-spacing-xs);
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
.error-state,
.empty-state,
.empty-batch {
  text-align: center;
  padding: 3rem 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
