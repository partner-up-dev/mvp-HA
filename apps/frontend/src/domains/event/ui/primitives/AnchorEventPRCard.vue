<template>
  <article class="event-pr-card">
    <RouterLink :to="prDetailPath(pr.id)" class="event-pr-card__link">
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

    <div v-if="hasActions" class="event-pr-card__actions">
      <slot name="actions" />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed, useSlots } from "vue";
import { RouterLink } from "vue-router";
import type { AnchorEventTimeWindowPR } from "@/domains/event/model/types";
import { prDetailPath } from "@/domains/pr/routing/routes";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";

type AnchorEventPRCardPR = Pick<
  AnchorEventTimeWindowPR,
  | "id"
  | "title"
  | "type"
  | "location"
  | "status"
  | "maxPartners"
  | "partnerCount"
>;

interface AnchorEventPRCardProps {
  pr: AnchorEventPRCardPR;
  coverImage?: string | null;
  timeLabel?: string | null;
}

const props = withDefaults(defineProps<AnchorEventPRCardProps>(), {
  coverImage: null,
  timeLabel: null,
});

const slots = useSlots();
const prTitle = computed(() => props.pr.title || props.pr.type);
const hasActions = computed(() => Boolean(slots.actions));
</script>

<style lang="scss" scoped>
.event-pr-card {
  display: flex;
  flex-direction: column;
  border-radius: 10px;
  background: var(--sys-color-surface-container);
  overflow: hidden;
}

.event-pr-card__link {
  display: block;
  color: inherit;
  text-decoration: none;
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

.event-pr-card__actions {
  display: flex;
  flex-direction: row;
  gap: var(--sys-spacing-small);
  padding: 0 var(--sys-spacing-small) var(--sys-spacing-small);
}

.event-pr-card__actions :deep(> *) {
  flex: 1 1 0;
}
</style>
