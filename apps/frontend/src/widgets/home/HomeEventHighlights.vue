<template>
  <section
    ref="sectionRef"
    class="event-highlights"
    :class="{ 'is-in-view': isInView }"
    aria-labelledby="home-highlights-title"
  >
    <header
      class="highlights-header"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(0)"
    >
      <h2 id="home-highlights-title">
        {{ t("home.landing.highlightsTitle") }}
      </h2>
      <p>{{ t("home.landing.highlightsSubtitle") }}</p>
    </header>

    <p
      v-if="isLoading"
      class="state-text"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
    >
      {{ t("common.loading") }}
    </p>
    <p
      v-else-if="isError"
      class="state-text state-text--error"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
    >
      {{ t("home.landing.highlightsLoadFailed") }}
    </p>
    <div
      v-else-if="highlightEvents.length === 0"
      class="empty-state"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
    >
      <p class="state-text">{{ t("home.landing.highlightsEmpty") }}</p>
      <RouterLink class="empty-action" :to="{ name: 'event-plaza' }">
        {{ t("home.landing.highlightsOpenPlaza") }}
      </RouterLink>
    </div>

    <ul
      v-else
      class="highlights-list"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
    >
      <li
        v-for="(event, index) in highlightEvents"
        :key="event.id"
        class="highlight-item"
        :class="{ 'is-in-view': isInView }"
        :style="itemMotionStyle(index + 2)"
      >
        <EventCard
          class="highlight-card"
          :class="{ 'is-pressed': pressedCardIndex === index }"
          :event="event"
          @click="trackHighlightClick(event.id, index)"
          @pointerdown="onCardPointerDown(index, $event)"
          @pointerup="releasePressedCard"
          @pointercancel="releasePressedCard"
          @pointerleave="releasePressedCard"
        />
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import EventCard from "@/components/event/EventCard.vue";
import { useInViewStagger } from "@/composables/useInViewStagger";
import { useAnchorEvents } from "@/queries/useAnchorEvents";
import { trackEvent } from "@/shared/analytics/track";

const MAX_HIGHLIGHT_COUNT = 4;

const { t } = useI18n();
const { targetRef: sectionRef, isInView, itemMotionStyle } = useInViewStagger();
const { data: events, isLoading, isError } = useAnchorEvents();

const highlightEvents = computed(() =>
  (events.value ?? []).slice(0, MAX_HIGHLIGHT_COUNT),
);

const hasTrackedSectionImpression = ref(false);
const pressedCardIndex = ref<number | null>(null);

const trackHighlightClick = (eventId: number, index: number) => {
  trackEvent("home_event_highlight_click", {
    eventId,
    index,
  });
};

const onCardPointerDown = (index: number, event: PointerEvent) => {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }
  pressedCardIndex.value = index;
};

const releasePressedCard = () => {
  pressedCardIndex.value = null;
};

watchEffect(() => {
  if (hasTrackedSectionImpression.value) {
    return;
  }
  if (!isInView.value || isLoading.value || isError.value) {
    return;
  }

  hasTrackedSectionImpression.value = true;
  trackEvent("home_event_section_impression", {
    source: "landing_v2",
    hasMappedUnit: false,
    unitCount: highlightEvents.value.length,
  });
});
</script>

<style lang="scss" scoped>
.event-highlights {
  display: flex;
  flex-direction: column;
  gap: calc(var(--sys-spacing-lg) + var(--sys-spacing-med));
  width: 100%;
  min-width: 0;
  min-height: 0;
  position: relative;
  isolation: isolate;
  --highlight-rail-inset: clamp(0.5rem, 2vw, 2rem);
}

.highlights-header {
  @include mx.pu-motion-enter(0.7rem);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  position: relative;
  z-index: 4;

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

.state-text,
.empty-state,
.highlights-list {
  @include mx.pu-motion-enter(0.65rem);
}

.state-text,
.empty-state {
  position: relative;
  z-index: 1;
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
  width: 100vw;
  max-width: none;
  min-width: 0;
  gap: clamp(0.8rem, 3vw, 1.2rem);
  margin: 0;
  margin-top: clamp(0.18rem, 0.7vw, 0.42rem);
  margin-inline: calc(50% - 50vw);
  padding-top: 0;
  padding-left: calc(var(--highlight-rail-inset) + var(--pu-safe-left));
  padding-right: calc(var(--highlight-rail-inset) + var(--pu-safe-right));
  padding-bottom: clamp(0.26rem, 1.3vw, 0.52rem);
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: calc(
    var(--highlight-rail-inset) + var(--pu-safe-left)
  );
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
  position: relative;
  z-index: 3;
}

.highlight-item {
  @include mx.pu-motion-enter(0.58rem);
  flex: 0 0 clamp(14.8rem, 72vw, 19.4rem);
  max-width: 100%;
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.highlight-card {
  @include mx.pu-motion-pressable(0.988);
  @include mx.pu-motion-ripple-base();
  min-height: 100%;
  display: block;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .highlight-card:hover {
    transform: translateY(-2px);
    @include mx.pu-elevation(2);
  }
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
