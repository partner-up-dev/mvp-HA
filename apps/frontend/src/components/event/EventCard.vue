<template>
  <RouterLink
    class="event-card"
    :to="{ name: 'anchor-event', params: { eventId: event.id } }"
    @click="handleClick"
  >
    <div
      v-if="event.coverImage"
      class="event-cover"
      :style="{ backgroundImage: `url(${event.coverImage})` }"
    />
    <div v-else class="event-cover event-cover--placeholder">
      <span>{{ event.type }}</span>
    </div>

    <div class="event-info">
      <h3 class="event-title">{{ event.title }}</h3>
      <p v-if="event.description" class="event-desc">
        {{ event.description }}
      </p>
      <div class="event-meta">
        <span>
          {{ t("eventPlaza.locationCount", { count: event.locationCount }) }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import type { AnchorEventListResponse } from "@/queries/useAnchorEvents";

interface EventCardProps {
  event: AnchorEventListResponse[number];
}

const props = defineProps<EventCardProps>();

const emit = defineEmits<{
  click: [eventId: number];
}>();

const { t } = useI18n();

const handleClick = () => {
  emit("click", props.event.id);
};
</script>

<style lang="scss" scoped>
.event-card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: var(--sys-color-surface-container);
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease;
  min-height: 100%;

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.event-cover {
  width: 100%;
  height: 140px;
  background-size: cover;
  background-position: center;

  &--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
    font-size: 1.25rem;
    font-weight: 600;
  }
}

.event-info {
  padding: 0.75rem 1rem 1rem;
}

.event-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.event-desc {
  font-size: 0.8125rem;
  color: var(--sys-color-on-surface-variant);
  margin: 0 0 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.event-meta {
  font-size: 0.75rem;
  color: var(--sys-color-outline);
}
</style>
