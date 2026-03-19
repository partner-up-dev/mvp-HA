<template>
  <RouterLink :to="anchorPRDetailPath(pr.id)" class="anchor-pr-card">
    <div
      v-if="coverImage"
      class="anchor-pr-card__cover"
      :style="{ backgroundImage: `url(${coverImage})` }"
    />
    <div class="anchor-pr-card__content">
      <div class="anchor-pr-card__header">
        <span class="anchor-pr-card__title">
          {{ prTitle }}
        </span>
        <span class="anchor-pr-card__status" :class="statusClass">
          {{ t(`prStatus.${pr.status}`) }}
        </span>
      </div>
      <div class="anchor-pr-card__meta">
        <span v-if="pr.location" class="anchor-pr-card__location">
          📍 {{ pr.location }}
        </span>
        <span class="anchor-pr-card__partners">
          👥 {{ pr.partnerCount }}
          <template v-if="pr.maxPartners">
            / {{ pr.maxPartners }}
          </template>
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import type { AnchorEventBatchPR } from "@/domains/event/model/types";
import { anchorPRDetailPath } from "@/domains/pr/routing/routes";

interface AnchorEventPRCardProps {
  pr: AnchorEventBatchPR;
  coverImage?: string | null;
}

const props = withDefaults(defineProps<AnchorEventPRCardProps>(), {
  coverImage: null,
});

const { t } = useI18n();

const prTitle = computed(() => props.pr.title || props.pr.type);
const statusClass = computed(
  () => `anchor-pr-card__status--${props.pr.status.toLowerCase()}`,
);
</script>

<style lang="scss" scoped>
.anchor-pr-card {
  display: block;
  border-radius: 10px;
  background: var(--sys-color-surface-container);
  text-decoration: none;
  color: inherit;
  overflow: hidden;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
  }
}

.anchor-pr-card__cover {
  width: 100%;
  height: 108px;
  background-size: cover;
  background-position: center;
}

.anchor-pr-card__content {
  padding: 0.75rem 1rem;
}

.anchor-pr-card__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.375rem;
  gap: 0.5rem;
}

.anchor-pr-card__title {
  font-size: 0.9375rem;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.anchor-pr-card__status {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  border-radius: 999px;
  background: var(--sys-color-surface-container-high);
  flex-shrink: 0;

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

.anchor-pr-card__meta {
  display: flex;
  gap: 1rem;
  font-size: 0.8125rem;
  color: var(--sys-color-on-surface-variant);
}
</style>
