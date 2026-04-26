<template>
  <PeekRadioCarousel
    class="anchor-event-radio-card-carousel"
    :model-value="props.modelValue"
    :items="props.events"
    :disabled="props.disabled"
    :aria-label="props.ariaLabel"
    @update:model-value="emit('update:modelValue', $event as number | null)"
  >
    <template #item="{ item, selected }">
      <EventCard
        mode="select"
        :event="asAnchorEventListItem(item)"
        :selected="selected"
        :disabled="props.disabled"
      />
    </template>
  </PeekRadioCarousel>
</template>

<script setup lang="ts">
import type { AnchorEventListItem } from "@/domains/event/model/types";
import EventCard from "@/domains/event/ui/primitives/EventCard.vue";
import PeekRadioCarousel from "@/domains/event/ui/composites/PeekRadioCarousel.vue";

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

const asAnchorEventListItem = (value: unknown): AnchorEventListItem =>
  value as AnchorEventListItem;
</script>

<style lang="scss" scoped>
.anchor-event-radio-card-carousel :deep(.event-card) {
  min-height: 100%;
}
</style>
