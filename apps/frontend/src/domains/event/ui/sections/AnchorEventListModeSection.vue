<template>
  <div v-if="hasBatches" class="batch-section">
    <TabBar
      :items="batchTabs"
      :model-value="selectedBatchId ?? -1"
      :aria-label="t('anchorEvent.batchLabel')"
      @update:model-value="handleBatchTabChange"
    />

    <p v-if="selectedBatch?.description" class="batch-description">
      {{ selectedBatch.description }}
    </p>

    <div v-if="selectedBatch" class="batch-content" role="tabpanel">
      <div class="pr-list" data-region="anchor-pr-list">
        <div v-if="selectedBatch.prs.length === 0" class="empty-batch">
          {{ t("anchorEvent.noPRsInBatch") }}
        </div>
        <AnchorEventPRCard
          v-for="pr in selectedBatch.prs"
          :key="pr.id"
          :pr="pr"
          :cover-image="resolveCoverImage(pr.location)"
        />
      </div>

      <div class="batch-action-cards">
        <AnchorPRCreateCard
          :title="createCardTitle"
          :batch-time-label="createBatchTimeLabel"
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

type BatchTabItem = {
  key: number;
  label: string;
  tabClass?: string;
};

type AnchorEventBatch = AnchorEventDetailResponse["batches"][number];
type AnchorEventBatchPR = AnchorEventBatch["prs"][number];

const props = defineProps<{
  hasBatches: boolean;
  batchTabs: BatchTabItem[];
  batches: AnchorEventBatch[];
  selectedBatchId: number | null;
  selectedBatch: AnchorEventBatch | null;
  eventId: number;
  eventTitle: string;
  eventBetaGroupQrCode: string | null;
  isCreatePending: boolean;
  createActionErrorMessage: string | null;
  resolveCoverImage: (location: string | null) => string | null;
}>();

const emit = defineEmits<{
  "select-batch": [batchId: number];
  "create-in-list": [payload: { batchId: number | null; locationId: string | null }];
}>();

const { t } = useI18n();
const createBatchId = ref<number | null>(null);

watch(
  () => props.selectedBatchId,
  (nextSelectedBatchId) => {
    if (nextSelectedBatchId !== null) {
      createBatchId.value = nextSelectedBatchId;
      return;
    }

    createBatchId.value = props.batches[0]?.id ?? null;
  },
  { immediate: true },
);

watch(
  () => props.batches,
  (batches) => {
    const currentBatchId = createBatchId.value;
    if (
      currentBatchId !== null &&
      batches.some((batch) => batch.id === currentBatchId)
    ) {
      return;
    }

    createBatchId.value = props.selectedBatchId ?? batches[0]?.id ?? null;
  },
  { immediate: true },
);

const batchTabLabelById = computed(() => {
  const map = new Map<number, string>();
  for (const tab of props.batchTabs) {
    map.set(tab.key, tab.label);
  }
  return map;
});

const createBatchOptions = computed(() =>
  props.batches.map((batch) => ({
    batchId: batch.id,
    label:
      batchTabLabelById.value.get(batch.id) ?? `${t("anchorEvent.batchLabel")} ${batch.id}`,
  })),
);

const createBatch = computed(() => {
  if (createBatchId.value === null) {
    return null;
  }

  return props.batches.find((batch) => batch.id === createBatchId.value) ?? null;
});

const createBatchTimeLabel = computed(() => {
  const targetBatchId = createBatch.value?.id ?? props.selectedBatch?.id ?? null;
  if (targetBatchId === null) {
    return "";
  }

  return batchTabLabelById.value.get(targetBatchId) ?? "";
});

const createBatchLocationOptions = computed(
  () => createBatch.value?.locationOptions ?? [],
);

const isAvailableAnchorPR = (pr: AnchorEventBatchPR): boolean =>
  pr.status === "OPEN" || pr.status === "READY";

const hasAvailableAnchorPRInCreateBatch = computed(() => {
  const batch = createBatch.value;
  if (!batch) {
    return false;
  }

  return batch.prs.some(isAvailableAnchorPR);
});

const createCardTitle = computed(() => {
  if (hasAvailableAnchorPRInCreateBatch.value) {
    return t("anchorEvent.createCard.title");
  }

  return t("anchorEvent.createCard.titleWhenNoAvailablePR");
});

const shouldAutoExpandCreateCard = computed(() => {
  const batch = props.selectedBatch;
  if (!batch) {
    return false;
  }

  return !batch.prs.some(isAvailableAnchorPR);
});

const createCardAutoExpandContextKey = computed(
  () => props.selectedBatch?.id ?? "none",
);

const handleCreateBatchChange = (batchId: number | null) => {
  createBatchId.value = batchId;
};

const handleBatchTabChange = (value: string | number) => {
  if (typeof value !== "number") {
    return;
  }

  emit("select-batch", value);
};

const handleCreateInList = (locationId: string | null) => {
  emit("create-in-list", {
    batchId: createBatchId.value,
    locationId,
  });
};
</script>

<style lang="scss" scoped>
.batch-section {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 1rem;
}

.batch-section :deep(.tab-bar) {
  margin-bottom: 0.4rem;
}

.batch-description {
  margin: 0 0 0.75rem;
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.pr-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.batch-content {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
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
