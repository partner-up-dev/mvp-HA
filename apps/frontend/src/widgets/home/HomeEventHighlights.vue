<template>
  <section class="event-highlights" aria-labelledby="home-highlights-title">
    <header class="highlights-header">
      <h2 id="home-highlights-title">{{ t("home.landing.highlightsTitle") }}</h2>
      <p>{{ t("home.landing.highlightsSubtitle") }}</p>
    </header>

    <p v-if="isLoading" class="state-text">{{ t("common.loading") }}</p>
    <p v-else-if="isError" class="state-text state-text--error">
      {{ t("home.landing.highlightsLoadFailed") }}
    </p>
    <div v-else-if="highlightEvents.length === 0" class="empty-state">
      <p class="state-text">{{ t("home.landing.highlightsEmpty") }}</p>
      <RouterLink class="empty-action" :to="{ name: 'event-plaza' }">
        {{ t("home.landing.highlightsOpenPlaza") }}
      </RouterLink>
    </div>

    <ul v-else class="highlights-list">
      <li
        v-for="(event, index) in highlightEvents"
        :key="event.id"
        class="highlight-item"
      >
        <RouterLink
          class="highlight-link"
          :to="{ name: 'anchor-event', params: { eventId: event.id } }"
          @click="trackHighlightClick(event.id, index)"
        >
          <div
            v-if="event.coverImage"
            class="highlight-cover"
            :style="{ backgroundImage: `url(${event.coverImage})` }"
          ></div>
          <div v-else class="highlight-cover highlight-cover--placeholder">
            <span>{{ event.type }}</span>
          </div>

          <div class="highlight-content">
            <h3>{{ event.title }}</h3>
            <p v-if="event.description" class="highlight-desc">
              {{ event.description }}
            </p>
            <span class="highlight-meta">
              {{ t("eventPlaza.locationCount", { count: event.locationCount }) }}
            </span>
          </div>
        </RouterLink>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useAnchorEvents } from "@/queries/useAnchorEvents";
import { trackEvent } from "@/shared/analytics/track";

const MAX_HIGHLIGHT_COUNT = 4;

const { t } = useI18n();
const { data: events, isLoading, isError } = useAnchorEvents();

const highlightEvents = computed(() =>
  (events.value ?? []).slice(0, MAX_HIGHLIGHT_COUNT),
);

const trackHighlightClick = (eventId: number, index: number) => {
  trackEvent("home_event_highlight_click", {
    eventId,
    index,
  });
};
</script>

<style lang="scss" scoped>
.event-highlights {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.highlights-header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2 {
    @include mx.pu-font(title-medium);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}

.state-text {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.state-text--error {
  color: var(--sys-color-error);
}

.empty-state {
  border: 1px dashed var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container-low);
  padding: var(--sys-spacing-med);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.empty-action {
  @include mx.pu-font(label-large);
  width: fit-content;
  text-decoration: none;
  color: var(--sys-color-primary);
}

.highlights-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  margin: 0;
  padding: 0;
}

.highlight-item {
  margin: 0;
}

.highlight-link {
  text-decoration: none;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container-low);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 180ms ease;

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.highlight-cover {
  width: 100%;
  aspect-ratio: 16 / 7;
  background-size: cover;
  background-position: center;
  background-color: var(--sys-color-surface-container);
}

.highlight-cover--placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sys-color-on-primary-container);
  background: var(--sys-color-primary-container);

  span {
    @include mx.pu-font(title-small);
  }
}

.highlight-content {
  padding: var(--sys-spacing-med);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h3 {
    @include mx.pu-font(title-small);
    color: var(--sys-color-on-surface);
    margin: 0;
  }
}

.highlight-desc {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.highlight-meta {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
}
</style>
