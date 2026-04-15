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
          :location-options="selectedBatch.locationOptions"
          :default-expanded="shouldAutoExpandCreateCard"
          :auto-expand-context-key="createCardAutoExpandContextKey"
          :pending="isCreatePending"
          :error-message="createActionErrorMessage"
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
import { computed } from "vue";
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
  "create-in-list": [locationId: string | null];
}>();

const { t } = useI18n();

const isAvailableAnchorPR = (pr: AnchorEventBatchPR): boolean =>
  pr.status === "OPEN" || pr.status === "READY";

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

const handleBatchTabChange = (value: string | number) => {
  if (typeof value !== "number") {
    return;
  }

  emit("select-batch", value);
};

const handleCreateInList = (locationId: string | null) => {
  emit("create-in-list", locationId);
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
