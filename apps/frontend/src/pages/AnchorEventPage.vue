<template>
  <PageScaffold class="anchor-event-page">
    <!-- Loading -->
    <div v-if="isLoading" class="loading-state">
      {{ t("common.loading") }}
    </div>

    <!-- Error -->
    <div v-else-if="isError" class="error-state">
      {{ t("anchorEvent.loadFailed") }}
      <router-link :to="{ name: 'event-plaza' }" class="back-link">
        {{ t("anchorEvent.backToPlaza") }}
      </router-link>
    </div>

    <!-- Content -->
    <template v-else-if="detail">
      <PageHeader
        :title="detail.title"
        :subtitle="detail.description ?? undefined"
        @back="goBackToPlaza"
      />

      <!-- Batch tabs -->
      <div v-if="detail.batches.length > 0" class="batch-section">
        <TabBar
          :items="batchTabs"
          :model-value="selectedBatchIndex"
          :aria-label="t('anchorEvent.batchLabel')"
          @update:model-value="handleBatchTabChange"
        />

        <!-- Selected batch PRs -->
        <div v-if="selectedBatch" class="batch-content" role="tabpanel">
          <div v-if="selectedBatch.prs.length === 0" class="empty-batch">
            {{ t("anchorEvent.noPRsInBatch") }}
          </div>
          <div v-else class="pr-list">
            <AnchorEventPRCard
              v-for="pr in selectedBatch.prs"
              :key="pr.id"
              :pr="pr"
              :cover-image="resolveCoverImage(pr.location)"
            />
          </div>
        </div>
      </div>

      <div v-else class="empty-state">
        {{ t("anchorEvent.noBatches") }}
      </div>

      <!-- Exhausted state -->
      <div v-if="detail.exhausted" class="exhausted-banner">
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
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import TabBar from "@/shared/ui/navigation/TabBar.vue";
import AnchorEventPRCard from "@/domains/event/ui/primitives/AnchorEventPRCard.vue";
import PageScaffold from "@/shared/ui/layout/PageScaffold.vue";
import { useAnchorEventDetail } from "@/domains/event/queries/useAnchorEventDetail";
import { usePoisByIds } from "@/shared/poi/queries/usePoisByIds";

const route = useRoute();
const { t } = useI18n();

const router = useRouter();

const goBackToPlaza = () => {
  router.push({ name: "event-plaza" });
};

const eventId = computed(() => {
  const raw = route.params.eventId;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
});

const { data: detail, isLoading, isError } = useAnchorEventDetail(eventId);

const selectedBatchIndex = ref(0);

const batchTabs = computed(() => {
  const batches = detail.value?.batches ?? [];
  return batches.map((batch, index) => ({
    key: index,
    label: formatBatchLabel(batch.timeWindow, index),
  }));
});

const handleBatchTabChange = (value: string | number) => {
  if (typeof value !== "number") return;
  selectedBatchIndex.value = value;
};

const selectedBatch = computed(() => {
  if (!detail.value?.batches) return null;
  return detail.value.batches[selectedBatchIndex.value] ?? null;
});

const selectedBatchPoiIdsCsv = computed(() => {
  const prs = selectedBatch.value?.prs ?? [];
  const uniqueLocationIds = Array.from(
    new Set(
      prs
        .map((pr) => (pr.location ? pr.location.trim() : ""))
        .filter((locationId) => locationId.length > 0),
    ),
  );
  return uniqueLocationIds.length > 0 ? uniqueLocationIds.join(",") : null;
});

const { data: selectedBatchPois } = usePoisByIds(selectedBatchPoiIdsCsv);

const poiCoverById = computed(() => {
  const map = new Map<string, string>();
  for (const poi of selectedBatchPois.value ?? []) {
    const cover = poi.gallery
      .map((imageUrl) => imageUrl.trim())
      .find((imageUrl) => imageUrl.length > 0);
    if (cover) {
      map.set(poi.id, cover);
    }
  }
  return map;
});

const resolveCoverImage = (location: string | null): string | null => {
  if (!location) return null;
  const locationId = location.trim();
  if (!locationId) return null;
  return poiCoverById.value.get(locationId) ?? null;
};

function formatBatchLabel(
  timeWindow: [string | null, string | null],
  index: number,
): string {
  const [start] = timeWindow;
  if (start) {
    // Show a compact date + time label for each batch tab.
    try {
      const d = new Date(start);
      if (Number.isNaN(d.getTime())) {
        return `${t("anchorEvent.batchLabel")} ${index + 1}`;
      }
      const datePart = d.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        weekday: "short",
      });
      const timePart = d.toLocaleTimeString("zh-CN", {
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
</script>

<style lang="scss" scoped>
.event-header {
  margin-bottom: 1.25rem;
}

.back-btn,
.back-link {
  display: inline-block;
  font-size: 0.875rem;
  color: var(--sys-color-primary);
  text-decoration: none;
  margin-bottom: 0.5rem;
}

.event-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.event-desc {
  font-size: 0.875rem;
  color: var(--sys-color-on-surface-variant);
}

.batch-section {
  margin-bottom: 1rem;
}

.batch-section :deep(.tab-bar) {
  margin-bottom: 1rem;
}

/* PR list */
.pr-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

/* Exhaustion banner */
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
