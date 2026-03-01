<template>
  <div class="anchor-event-page">
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
      <header class="event-header">
        <router-link :to="{ name: 'event-plaza' }" class="back-btn">
          ← {{ t("anchorEvent.backToPlaza") }}
        </router-link>
        <h1 class="event-title">{{ detail.title }}</h1>
        <p v-if="detail.description" class="event-desc">
          {{ detail.description }}
        </p>
      </header>

      <!-- Batch tabs -->
      <div v-if="detail.batches.length > 0" class="batch-section">
        <div class="batch-tabs" role="tablist">
          <button
            v-for="(batch, index) in detail.batches"
            :key="batch.id"
            role="tab"
            :aria-selected="selectedBatchIndex === index"
            class="batch-tab"
            :class="{ 'batch-tab--active': selectedBatchIndex === index }"
            @click="selectedBatchIndex = index"
          >
            {{ formatBatchLabel(batch.timeWindow, index) }}
          </button>
        </div>

        <!-- Selected batch PRs -->
        <div v-if="selectedBatch" class="batch-content" role="tabpanel">
          <div v-if="selectedBatch.prs.length === 0" class="empty-batch">
            {{ t("anchorEvent.noPRsInBatch") }}
          </div>
          <div v-else class="pr-list">
            <router-link
              v-for="pr in selectedBatch.prs"
              :key="pr.id"
              :to="{ name: 'pr', params: { id: pr.id } }"
              class="pr-card"
            >
              <div class="pr-card__header">
                <span class="pr-card__title">
                  {{ pr.title || pr.type }}
                </span>
                <span
                  class="pr-card__status"
                  :class="`pr-card__status--${pr.status.toLowerCase()}`"
                >
                  {{ t(`prStatus.${pr.status}`) }}
                </span>
              </div>
              <div class="pr-card__meta">
                <span v-if="pr.location" class="pr-card__location">
                  📍 {{ pr.location }}
                </span>
                <span class="pr-card__partners">
                  👥 {{ pr.partnerCount }}
                  <template v-if="pr.maxPartners">
                    / {{ pr.maxPartners }}
                  </template>
                </span>
              </div>
            </router-link>
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAnchorEventDetail } from "@/queries/useAnchorEventDetail";

const route = useRoute();
const { t } = useI18n();

const eventId = computed(() => {
  const raw = route.params.eventId;
  const num = Number(raw);
  return Number.isFinite(num) && num > 0 ? num : null;
});

const { data: detail, isLoading, isError } = useAnchorEventDetail(eventId);

const selectedBatchIndex = ref(0);

const selectedBatch = computed(() => {
  if (!detail.value?.batches) return null;
  return detail.value.batches[selectedBatchIndex.value] ?? null;
});

function formatBatchLabel(
  timeWindow: [string | null, string | null],
  index: number,
): string {
  const [start] = timeWindow;
  if (start) {
    // Show a short date or datetime label
    try {
      const d = new Date(start);
      return d.toLocaleDateString("zh-CN", {
        month: "short",
        day: "numeric",
        weekday: "short",
      });
    } catch {
      return `${t("anchorEvent.batchLabel")} ${index + 1}`;
    }
  }
  return `${t("anchorEvent.batchLabel")} ${index + 1}`;
}
</script>

<style lang="scss" scoped>
.anchor-event-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
}

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

/* Batch tabs */
.batch-tabs {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.5rem;
  margin-bottom: 1rem;
}

.batch-tab {
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--sys-color-outline-variant);
  background: transparent;
  color: var(--sys-color-on-surface);
  font-size: 0.8125rem;
  cursor: pointer;
  transition: all 0.15s ease;

  &--active {
    background: var(--sys-color-primary);
    color: var(--sys-color-on-primary);
    border-color: var(--sys-color-primary);
  }
}

/* PR list */
.pr-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.pr-card {
  display: block;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  background: var(--sys-color-surface-container);
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }

  &__header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.375rem;
  }

  &__title {
    font-size: 0.9375rem;
    font-weight: 600;
  }

  &__status {
    font-size: 0.75rem;
    padding: 0.125rem 0.5rem;
    border-radius: 999px;
    background: var(--sys-color-surface-container-high);

    &--open {
      color: var(--sys-color-primary);
    }
    &--ready {
      color: var(--sys-color-tertiary);
    }
    &--full {
      color: var(--sys-color-error);
    }
    &--active {
      color: var(--sys-color-primary);
    }
    &--locked_to_start {
      color: var(--sys-color-secondary);
    }
  }

  &__meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8125rem;
    color: var(--sys-color-on-surface-variant);
  }
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
