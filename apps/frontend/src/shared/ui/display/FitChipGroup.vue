<template>
  <div class="fit-chip-group" :aria-label="ariaLabel">
    <div
      ref="measureRowRef"
      class="fit-chip-group__measure"
      :class="gapClass"
      aria-hidden="true"
    >
      <span
        v-for="(item, index) in candidateItems"
        :key="`measure-${item}-${index}`"
        :ref="(element) => setMeasureItemRef(index, element)"
        class="fit-chip-group__item"
      >
        <Chip :tone="tone" :size="size" :class="chipClass">
          {{ item }}
        </Chip>
      </span>
    </div>

    <div
      v-if="visibleItems.length > 0 || !hasMeasured"
      class="fit-chip-group__row"
      :class="[gapClass, { 'is-ready': hasMeasured }]"
    >
      <span
        v-for="(item, index) in visibleItems"
        :key="`${item}-${index}`"
        class="fit-chip-group__item"
      >
        <Chip :tone="tone" :size="size" :class="chipClass">
          {{ item }}
        </Chip>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import Chip from "@/shared/ui/display/Chip.vue";

type FitChipGroupGap = "xs" | "sm" | "md";
type FitChipGroupTone =
  | "secondary"
  | "primary"
  | "surface"
  | "outline"
  | "danger"
  | "warning";
type FitChipGroupSize = "sm" | "md";
type FitChipGroupClass = string | string[] | Record<string, boolean>;

const props = withDefaults(
  defineProps<{
    items: string[];
    maxItems?: number;
    gap?: FitChipGroupGap;
    tone?: FitChipGroupTone;
    size?: FitChipGroupSize;
    ariaLabel?: string;
    chipClass?: FitChipGroupClass;
  }>(),
  {
    maxItems: Number.POSITIVE_INFINITY,
    gap: "xs",
    tone: "surface",
    size: "sm",
    ariaLabel: undefined,
    chipClass: undefined,
  },
);

const measureRowRef = ref<HTMLElement | null>(null);
const measureItemRefs = ref<(HTMLElement | null)[]>([]);
const visibleItemCount = ref(0);
const hasMeasured = ref(false);

const candidateItems = computed(() => props.items.slice(0, props.maxItems));
const visibleItems = computed(() =>
  candidateItems.value.slice(0, visibleItemCount.value),
);
const gapClass = computed(() => `fit-chip-group--gap-${props.gap}`);

const setMeasureItemRef = (index: number, element: unknown): void => {
  measureItemRefs.value[index] = element instanceof HTMLElement ? element : null;
};

const syncVisibleItemCount = (): void => {
  const measureRow = measureRowRef.value;

  if (!measureRow) {
    visibleItemCount.value = 0;
    hasMeasured.value = true;
    return;
  }

  const rowWidth = measureRow.clientWidth;
  let fitCount = 0;

  for (const itemRef of measureItemRefs.value.slice(0, candidateItems.value.length)) {
    if (!itemRef) {
      break;
    }

    const itemRightEdge = itemRef.offsetLeft + itemRef.offsetWidth;
    if (itemRightEdge > rowWidth) {
      break;
    }

    fitCount += 1;
  }

  visibleItemCount.value = fitCount;
  hasMeasured.value = true;
};

const scheduleVisibleItemSync = async (): Promise<void> => {
  hasMeasured.value = false;
  await nextTick();
  syncVisibleItemCount();
};

watch(
  candidateItems,
  () => {
    measureItemRefs.value = [];
    visibleItemCount.value = 0;
    void scheduleVisibleItemSync();
  },
  {
    immediate: true,
  },
);

let resizeObserver: ResizeObserver | null = null;

watch(measureRowRef, (measureRow) => {
  if (resizeObserver) {
    resizeObserver.disconnect();
    if (measureRow) {
      resizeObserver.observe(measureRow);
    }
  }

  if (measureRow) {
    void scheduleVisibleItemSync();
  } else {
    visibleItemCount.value = 0;
  }
});

onMounted(() => {
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(() => {
      void scheduleVisibleItemSync();
    });

    if (measureRowRef.value) {
      resizeObserver.observe(measureRowRef.value);
    }
  }

  void scheduleVisibleItemSync();
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
});
</script>

<style lang="scss" scoped>
.fit-chip-group {
  position: relative;
  display: block;
  width: 100%;
}

.fit-chip-group__row,
.fit-chip-group__measure {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  overflow: hidden;
}

.fit-chip-group__row {
  visibility: hidden;

  &.is-ready {
    visibility: visible;
  }
}

.fit-chip-group__measure {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  visibility: hidden;
  pointer-events: none;
}

.fit-chip-group__item {
  display: inline-flex;
  flex-shrink: 0;
}

.fit-chip-group--gap-xs {
  gap: var(--sys-spacing-xs);
}

.fit-chip-group--gap-sm {
  gap: var(--sys-spacing-sm);
}

.fit-chip-group--gap-md {
  gap: var(--sys-spacing-med);
}
</style>
