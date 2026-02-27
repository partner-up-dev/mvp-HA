<template>
  <div class="event-plaza-page">
    <h1 class="page-title">{{ t("eventPlaza.title") }}</h1>
    <p class="page-subtitle">{{ t("eventPlaza.subtitle") }}</p>

    <div v-if="isLoading" class="loading-state">
      {{ t("common.loading") }}
    </div>

    <div v-else-if="isError" class="error-state">
      {{ t("eventPlaza.loadFailed") }}
    </div>

    <div v-else-if="events && events.length > 0" class="event-grid">
      <router-link
        v-for="event in events"
        :key="event.id"
        :to="{ name: 'anchor-event', params: { eventId: event.id } }"
        class="event-card"
      >
        <div
          v-if="event.coverImage"
          class="event-cover"
          :style="{ backgroundImage: `url(${event.coverImage})` }"
        />
        <div v-else class="event-cover event-cover--placeholder">
          <span class="event-type-icon">{{ event.type }}</span>
        </div>
        <div class="event-info">
          <h3 class="event-title">{{ event.title }}</h3>
          <p v-if="event.description" class="event-desc">
            {{ event.description }}
          </p>
          <div class="event-meta">
            <span class="event-locations">
              {{
                t("eventPlaza.locationCount", { count: event.locationCount })
              }}
            </span>
          </div>
        </div>
      </router-link>
    </div>

    <div v-else class="empty-state">
      {{ t("eventPlaza.noEvents") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { useAnchorEvents } from "@/queries/useAnchorEvents";

const { t } = useI18n();
const { data: events, isLoading, isError } = useAnchorEvents();
</script>

<style lang="scss" scoped>
.event-plaza-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
}

.page-title {
  font-size: 1.5rem;
  font-weight: 700;
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--sys-color-on-surface-variant);
  font-size: 0.875rem;
  margin-bottom: 1.5rem;
}

.event-grid {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.event-card {
  display: flex;
  flex-direction: column;
  border-radius: 12px;
  overflow: hidden;
  background: var(--sys-color-surface-container);
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease;

  &:active {
    transform: scale(0.98);
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
  margin-bottom: 0.25rem;
}

.event-desc {
  font-size: 0.8125rem;
  color: var(--sys-color-on-surface-variant);
  margin-bottom: 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.event-meta {
  font-size: 0.75rem;
  color: var(--sys-color-outline);
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 3rem 0;
  color: var(--sys-color-on-surface-variant);
}
</style>
