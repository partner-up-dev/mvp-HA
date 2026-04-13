<template>
  <ul
    class="anchor-event-horizontal-list"
    :class="`anchor-event-horizontal-list--${variant}`"
  >
    <li
      v-for="(event, index) in visibleEvents"
      :key="event.id"
      class="anchor-event-horizontal-list__item"
    >
      <EventCard
        class="anchor-event-horizontal-list__card"
        :event="event"
        :variant="cardVariant"
        :surface="cardSurface"
        @click="emitCardClick(event.id, index)"
      />
    </li>
  </ul>
</template>

<script setup lang="ts">
import { computed } from "vue";
import EventCard from "@/domains/event/ui/primitives/EventCard.vue";
import type { AnchorEventListItem } from "@/domains/event/model/types";

const props = withDefaults(
  defineProps<{
    events: readonly AnchorEventListItem[];
    maxCount?: number;
    variant?: "full-bleed" | "contained";
    cardVariant?: "default" | "shorter";
    cardSurface?: "filled" | "outline";
  }>(),
  {
    maxCount: 4,
    variant: "contained",
    cardVariant: "shorter",
    cardSurface: "filled",
  },
);

const emit = defineEmits<{
  "card-click": [payload: { eventId: number; index: number }];
}>();

const visibleEvents = computed(() => props.events.slice(0, props.maxCount));

const emitCardClick = (eventId: number, index: number) => {
  emit("card-click", { eventId, index });
};
</script>

<style lang="scss" scoped>
.anchor-event-horizontal-list {
  --event-rail-inset: clamp(0.5rem, 2vw, 2rem);

  list-style: none;
  display: flex;
  flex-direction: row;
  min-width: 0;
  gap: clamp(0.8rem, 3vw, 1.2rem);
  margin: 0;
  padding-top: var(--sys-spacing-sm);
  padding-bottom: var(--sys-spacing-sm);
  overflow-x: auto;
  overflow-y: visible;
  scroll-snap-type: x mandatory;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x;
}

.anchor-event-horizontal-list--full-bleed {
  width: 100vw;
  max-width: none;
  margin-inline: calc(50% - 50vw);
  padding-left: calc(var(--event-rail-inset) + var(--pu-safe-left));
  padding-right: calc(var(--event-rail-inset) + var(--pu-safe-right));
  scroll-padding-inline: calc(var(--event-rail-inset) + var(--pu-safe-left));
  background-color: var(--sys-color-surface);
}

.anchor-event-horizontal-list--contained {
  width: 100%;
  padding-left: 0;
  padding-right: 0;
  scroll-padding-inline: 0;
  background: transparent;
}

.anchor-event-horizontal-list__item {
  flex: 0 0 clamp(14.8rem, 72vw, 19.4rem);
  max-width: 100%;
  min-width: 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.anchor-event-horizontal-list__card {
  @include mx.pu-motion-pressable(0.988);
  @include mx.pu-motion-ripple-base();
  min-height: 100%;
  transition:
    transform 180ms ease,
    box-shadow 180ms ease;
}

@media (hover: hover) and (pointer: fine) {
  .anchor-event-horizontal-list__card:hover:not(.event-card--outline) {
    transform: translateY(-2px);
    @include mx.pu-elevation(2);
  }
}

@media (max-width: 768px) {
  .anchor-event-horizontal-list {
    gap: var(--sys-spacing-sm);
  }

  .anchor-event-horizontal-list__item {
    flex-basis: clamp(14.4rem, 79vw, 17.2rem);
  }
}
</style>
