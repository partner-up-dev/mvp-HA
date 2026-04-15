<template>
  <div v-if="hasBatches" class="date-section">
    <TabBar
      :items="dateTabs"
      :model-value="selectedDateKey ?? 'none'"
      :aria-label="t('anchorEvent.dateLabel')"
      @update:model-value="handleDateTabChange"
    />

    <div v-if="selectedDateGroup" class="date-content" role="tabpanel">
      <div class="batch-list" data-region="anchor-pr-list">
        <section
          v-for="batchItem in selectedDateGroup.batches"
          :key="batchItem.batch.id"
          class="batch-panel"
        >
          <div class="pr-list">
            <div v-if="batchItem.batch.prs.length === 0" class="empty-batch">
              {{ t("anchorEvent.noPRsInBatch") }}
            </div>
            <AnchorEventPRCard
              v-for="pr in batchItem.batch.prs"
              :key="pr.id"
              :pr="pr"
              :time-label="batchItem.timeLabel"
              :cover-image="resolveCoverImage(pr.location)"
            />
          </div>
        </section>
      </div>

      <div class="batch-action-cards">
        <AnchorPRCreateCard
          :title="createCardTitle"
          :batch-time-label="createCardSubtitleTimeLabel"
          :event-title="eventTitle"
          :batch-options="createBatchOptions"
          :selected-batch-id="createBatchId"
          :location-options="createBatchLocationOptions"
          :default-expanded="shouldAutoExpandCreateCard"
          :auto-expand-context-key="createCardAutoExpandContextKey"
          :pending="isCreatePending"
          :error-message="createActionErrorMessage"
          @update:selected-batch-id="handleCreateBatchChange"
          @create="handleCreateInList"
          data-region="create-anchor-pr"
        />
        <AnchorEventBetaGroupCard
          :event-id="eventId"
          :event-title="eventTitle"
          :qr-code-url="eventBetaGroupQrCode"
          :default-expanded="false"
          variant="list"
        />
        <OtherAnchorEventsSection
          :current-event-id="eventId"
          variant="panel"
          data-region="discover-other-events"
        />
      </div>
    </div>
  </div>

  <div v-else class="empty-state">
    {{ t("anchorEvent.noBatches") }}
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import TabBar from "@/shared/ui/navigation/TabBar.vue";
import AnchorEventPRCard from "@/domains/event/ui/primitives/AnchorEventPRCard.vue";
import AnchorPRCreateCard from "@/domains/event/ui/primitives/AnchorPRCreateCard.vue";
import AnchorEventBetaGroupCard from "@/domains/event/ui/primitives/AnchorEventBetaGroupCard.vue";
import OtherAnchorEventsSection from "@/domains/event/ui/sections/OtherAnchorEventsSection.vue";
import type { AnchorEventDetailResponse } from "@/domains/event/model/types";

type DateTabItem = {
  key: string;
  label: string;
  tabClass?: string;
};

type AnchorEventBatch = AnchorEventDetailResponse["batches"][number];
type AnchorEventBatchPR = AnchorEventBatch["prs"][number];

type DateGroupBatchItem = {
  batch: AnchorEventBatch;
  timeLabel: string;
};

type DateGroup = {
  key: string;
  label: string;
  batches: DateGroupBatchItem[];
};

type CreateBatchChoice = {
  batch: AnchorEventBatch;
  optionLabel: string;
  subtitleLabel: string;
};

const props = defineProps<{
  hasBatches: boolean;
  dateTabs: DateTabItem[];
  selectedDateKey: string | null;
  selectedDateGroup: DateGroup | null;
  createBatchChoices: CreateBatchChoice[];
  eventId: number;
  eventTitle: string;
  eventBetaGroupQrCode: string | null;
  isCreatePending: boolean;
  createActionErrorMessage: string | null;
  resolveCoverImage: (location: string | null) => string | null;
}>();

const emit = defineEmits<{
  "select-date": [dateKey: string];
  "create-in-list": [
    payload: { batchId: number | null; locationId: string | null },
  ];
}>();

const { t } = useI18n();
const createBatchId = ref<number | null>(null);

const isAvailableAnchorPR = (pr: AnchorEventBatchPR): boolean =>
  pr.status === "OPEN" || pr.status === "READY";

const batchHasAvailableAnchorPR = (batch: AnchorEventBatch): boolean =>
  batch.prs.some(isAvailableAnchorPR);

const resolveDefaultCreateBatchId = (
  group: DateGroup | null,
): number | null => {
  if (!group) {
    return null;
  }

  const firstCreatableBatchWithoutAvailablePR = group.batches.find(
    ({ batch }) =>
      batch.locationOptions.some((option) => !option.disabled) &&
      !batchHasAvailableAnchorPR(batch),
  );
  if (firstCreatableBatchWithoutAvailablePR) {
    return firstCreatableBatchWithoutAvailablePR.batch.id;
  }

  const firstCreatableBatch = group.batches.find(({ batch }) =>
    batch.locationOptions.some((option) => !option.disabled),
  );
  if (firstCreatableBatch) {
    return firstCreatableBatch.batch.id;
  }

  return group.batches[0]?.batch.id ?? null;
};

watch(
  [() => props.selectedDateGroup, () => props.createBatchChoices],
  ([group, createBatchChoices]) => {
    const currentBatchId = createBatchId.value;
    if (
      currentBatchId !== null &&
      createBatchChoices.some(({ batch }) => batch.id === currentBatchId)
    ) {
      return;
    }

    const preferredBatchId = resolveDefaultCreateBatchId(group);
    if (
      preferredBatchId !== null &&
      createBatchChoices.some(({ batch }) => batch.id === preferredBatchId)
    ) {
      createBatchId.value = preferredBatchId;
      return;
    }

    createBatchId.value = createBatchChoices[0]?.batch.id ?? null;
  },
  { immediate: true, deep: true },
);

const batchLabelById = computed(() => {
  const map = new Map<number, string>();
  for (const batchChoice of props.createBatchChoices) {
    map.set(batchChoice.batch.id, batchChoice.subtitleLabel);
  }
  return map;
});

const createBatchOptions = computed(() =>
  props.createBatchChoices.map(({ batch, optionLabel }) => ({
    batchId: batch.id,
    label: optionLabel,
  })),
);

const createBatch = computed(() => {
  if (createBatchId.value === null) {
    return null;
  }

  return (
    props.createBatchChoices.find(({ batch }) => batch.id === createBatchId.value)
      ?.batch ?? null
  );
});

const createBatchTimeLabel = computed(() => {
  const targetBatchId = createBatch.value?.id ?? null;
  if (targetBatchId === null) {
    return "";
  }

  return batchLabelById.value.get(targetBatchId) ?? "";
});

const createCardSubtitleTimeLabel = computed(() => {
  const batchTimeLabel = createBatchTimeLabel.value;
  return batchTimeLabel;
});

const createBatchLocationOptions = computed(
  () => createBatch.value?.locationOptions ?? [],
);

const hasAvailableAnchorPRInCreateBatch = computed(() => {
  const batch = createBatch.value;
  if (!batch) {
    return false;
  }

  return batchHasAvailableAnchorPR(batch);
});

const hasAvailableAnchorPRInSelectedDate = computed(() => {
  const group = props.selectedDateGroup;
  if (!group) {
    return false;
  }

  return group.batches.some(({ batch }) => batchHasAvailableAnchorPR(batch));
});

const createCardTitle = computed(() => {
  if (hasAvailableAnchorPRInSelectedDate.value) {
    return t("anchorEvent.createCard.title");
  }

  return t("anchorEvent.createCard.titleWhenNoAvailablePR");
});

const shouldAutoExpandCreateCard = computed(() => {
  if (!props.selectedDateGroup) {
    return false;
  }

  return !hasAvailableAnchorPRInSelectedDate.value;
});

const createCardAutoExpandContextKey = computed(
  () =>
    `${props.selectedDateKey ?? "none"}:${createBatchId.value ?? "none"}`,
);

const handleCreateBatchChange = (batchId: number | null) => {
  createBatchId.value = batchId;
};

const handleDateTabChange = (value: string | number) => {
  emit("select-date", String(value));
};

const handleCreateInList = (locationId: string | null) => {
  emit("create-in-list", {
    batchId: createBatchId.value,
    locationId,
  });
};
</script>

<style lang="scss" scoped>
.date-section {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 1rem;
}

.date-section :deep(.tab-bar) {
  margin-bottom: 1rem;
}

.date-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.batch-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.batch-panel {
  display: flex;
  flex-direction: column;
}

.pr-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.batch-action-cards {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  margin-top: auto;
  padding-top: var(--sys-spacing-med);
}

.empty-state,
.empty-batch {
  text-align: center;
  padding: 3rem 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
