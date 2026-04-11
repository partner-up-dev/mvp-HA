<template>
  <div
    ref="carouselRef"
    class="anchor-event-radio-card-carousel"
    :aria-label="props.ariaLabel"
  >
    <EventCard
      v-for="event in props.events"
      :key="event.id"
      mode="select"
      :event="event"
      :selected="event.id === props.modelValue"
      :disabled="props.disabled"
      data-anchor-event-option="true"
      :data-anchor-event-selected="event.id === props.modelValue"
      @click="emit('update:modelValue', event.id)"
    />
  </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from "vue";
import type { AnchorEventListItem } from "@/domains/event/model/types";
import EventCard from "@/domains/event/ui/primitives/EventCard.vue";

const props = withDefaults(
  defineProps<{
    modelValue: number | null;
    events: readonly AnchorEventListItem[];
    disabled?: boolean;
    ariaLabel?: string;
  }>(),
  {
    disabled: false,
    ariaLabel: undefined,
  },
);

const emit = defineEmits<{
  "update:modelValue": [eventId: number | null];
}>();

const carouselRef = ref<HTMLElement | null>(null);

const scrollSelectedCardIntoView = async () => {
  await nextTick();
  const carousel = carouselRef.value;
  if (!carousel) {
    return;
  }

  const selectedCard = carousel.querySelector<HTMLElement>(
    "[data-anchor-event-selected='true']",
  );
  if (!selectedCard) {
    return;
  }

  selectedCard.scrollIntoView({
    behavior: "smooth",
    block: "nearest",
    inline: "center",
  });
};

onMounted(() => {
  void scrollSelectedCardIntoView();
});

watch(
  () => props.modelValue,
  () => {
    void scrollSelectedCardIntoView();
  },
);
</script>

<style lang="scss" scoped>
.anchor-event-radio-card-carousel {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(16rem, 18rem);
  gap: var(--sys-spacing-sm);
  overflow-x: auto;
  overflow-y: visible;
  padding:
    var(--sys-spacing-xs)
    clamp(var(--sys-spacing-sm), 9vw, var(--sys-spacing-xl));
  scroll-snap-type: x mandatory;
  scroll-padding-inline: clamp(
    var(--sys-spacing-sm),
    9vw,
    var(--sys-spacing-xl)
  );
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
}

.anchor-event-radio-card-carousel:deep([data-anchor-event-option="true"]) {
  min-height: 100%;
  scroll-snap-align: center;
  scroll-snap-stop: always;
  transform: scale(0.92);
  opacity: 0.78;
  transition:
    transform 180ms ease,
    opacity 180ms ease;
}

.anchor-event-radio-card-carousel:deep(
    [data-anchor-event-option="true"][data-anchor-event-selected="true"]
  ) {
  transform: scale(1);
  opacity: 1;
}

@media (max-width: 768px) {
  .anchor-event-radio-card-carousel {
    grid-auto-columns: minmax(14.4rem, 17rem);
  }
}
</style>
