<template>
  <RouterLink :to="prDetailPath(pr.id)" class="event-pr-card">
    <div
      v-if="coverImage"
      class="event-pr-card__cover"
      :style="{ backgroundImage: `url(${coverImage})` }"
    />
    <div class="event-pr-card__content">
      <div class="event-pr-card__header">
        <div class="event-pr-card__headline">
          <span class="event-pr-card__title">
            {{ prTitle }}
          </span>
        </div>
        <PRStatusBadge
          class="event-pr-card__status"
          :status="pr.status"
          size="sm"
          appearance="pill"
        />
      </div>
      <div class="event-pr-card__meta">
        <span v-if="timeLabel" class="event-pr-card__time">
          🕒 {{ timeLabel }}
        </span>
        <span v-if="pr.location" class="event-pr-card__location">
          📍 {{ pr.location }}
        </span>
        <span class="event-pr-card__partners">
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
import { RouterLink } from "vue-router";
import type { AnchorEventTimeWindowPR } from "@/domains/event/model/types";
import { prDetailPath } from "@/domains/pr/routing/routes";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";

interface AnchorEventPRCardProps {
  pr: AnchorEventTimeWindowPR;
  coverImage?: string | null;
  timeLabel?: string | null;
}

const props = withDefaults(defineProps<AnchorEventPRCardProps>(), {
  coverImage: null,
  timeLabel: null,
});

const prTitle = computed(() => props.pr.title || props.pr.type);
</script>

<style lang="scss" scoped>
.event-pr-card {
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

.event-pr-card__cover {
  width: 100%;
  height: 108px;
  background-size: cover;
  background-position: center;
}

.event-pr-card__content {
  padding: 0.75rem 1rem;
}

.event-pr-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.375rem;
  gap: 0.5rem;
}

.event-pr-card__headline {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-xsmall) / 2);
  min-width: 0;
}

.event-pr-card__title {
  @include mx.pu-font(title-small);
  overflow-wrap: anywhere;
}

.event-pr-card__status {
  flex-shrink: 0;
}

.event-pr-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-medium);
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}
</style>
