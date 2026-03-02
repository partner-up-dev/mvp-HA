<template>
  <section class="event-highlights" aria-labelledby="home-highlights-title">
    <header class="highlights-header">
      <h2 id="home-highlights-title">
        {{ t("home.landing.highlightsTitle") }}
      </h2>
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

    <ul v-else class="highlights-list swiper-no-swiping">
      <li
        v-for="(event, index) in highlightEvents"
        :key="event.id"
        class="highlight-item"
      >
        <EventCard
          :event="event"
          @click="trackHighlightClick(event.id, index)"
        />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import EventCard from "@/components/event/EventCard.vue";
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
  gap: clamp(1rem, 4vw, 1.8rem);
  width: 100%;
  min-width: 0;
  min-height: 0;
}

.highlights-header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);

  h2 {
    @include mx.pu-font(headline-small);
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
  padding: var(--sys-spacing-sm) 0;
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
  flex-direction: row;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  gap: clamp(0.8rem, 3vw, 1.2rem);
  margin: 0;
  padding: 0 0 clamp(0.2rem, 1.2vw, 0.45rem);
  overflow-x: auto;
  overflow-y: hidden;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 0;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
}

.highlight-item {
  flex: 0 0 clamp(14.8rem, 72vw, 19.4rem);
  max-width: 100%;
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

@media (max-width: 768px) {
  .highlights-list {
    gap: var(--sys-spacing-sm);
  }

  .highlight-item {
    flex-basis: clamp(14.4rem, 79vw, 17.2rem);
  }
}
</style>
