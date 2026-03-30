<template>
  <RouterLink
    class="event-card"
    :to="{ name: 'anchor-event', params: { eventId: event.id } }"
    @click="handleClick"
  >
    <div
      v-if="coverImage"
      class="event-cover"
      :style="{ backgroundImage: `url(${coverImage})` }"
    />
    <div
      v-else-if="poisGalleryCoverImage"
      class="event-cover"
      :style="{ backgroundImage: `url(${poisGalleryCoverImage})` }"
    />
    <div
      v-else-if="activeFallbackImage"
      class="event-cover"
      :style="{ backgroundImage: `url(${activeFallbackImage})` }"
    />
    <div v-else class="event-cover event-cover--placeholder">
      <span>{{ event.type }}</span>
    </div>

    <div class="event-info">
      <div
        v-if="availableLocations.length > 0"
        class="event-available-locations-stack"
      >
        <div
          ref="availableLocationsMeasureRef"
          class="event-available-locations-measure"
          aria-hidden="true"
        >
          <span
            v-for="(location, index) in availableLocations"
            :key="`measure-${location}`"
            :ref="(element) => setMeasurePillRef(index, element)"
            class="event-available-location-pill"
          >
            {{ location }}
          </span>
        </div>

        <div
          v-if="
            visibleAvailableLocations.length > 0 || !hasMeasuredAvailableLocations
          "
          class="event-available-locations-row"
          :class="{ 'is-ready': hasMeasuredAvailableLocations }"
        >
          <span
            v-for="location in visibleAvailableLocations"
            :key="location"
            class="event-available-location-pill"
          >
            {{ location }}
          </span>
        </div>
      </div>
      <h3 class="event-title">{{ event.title }}</h3>
      <p v-if="event.description" class="event-desc">
        {{ event.description }}
      </p>
      <span class="event-cta">
        {{ t("eventPlaza.openEventAction") }}
        <span class="event-cta-icon i-mdi:arrow-right" aria-hidden="true" />
      </span>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  watchEffect,
} from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import type { AnchorEventListItem } from "@/domains/event/model/types";

interface EventCardProps {
  event: AnchorEventListItem;
}

const props = defineProps<EventCardProps>();
const MAX_AVAILABLE_LOCATION_PILLS = 3;

const emit = defineEmits<{
  click: [eventId: number];
}>();

const { t } = useI18n();

const normalizeImageUrl = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const normalizeGallery = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  const uniqueUrls = new Set<string>();
  for (const item of value) {
    const normalizedUrl = normalizeImageUrl(item);
    if (!normalizedUrl) {
      continue;
    }
    uniqueUrls.add(normalizedUrl);
  }

  return Array.from(uniqueUrls);
};

const readRecordValue = (value: unknown, key: string): unknown => {
  if (typeof value !== "object" || value === null) {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
};

const coverImage = computed(() => normalizeImageUrl(props.event.coverImage));
const availableLocations = computed(() => {
  if (!Array.isArray(props.event.locationPool)) {
    return [];
  }

  const uniqueLocations: string[] = [];
  const locationSet = new Set<string>();

  for (const location of props.event.locationPool) {
    if (typeof location !== "string") {
      continue;
    }

    const normalizedLocation = location.trim();
    if (!normalizedLocation || locationSet.has(normalizedLocation)) {
      continue;
    }

    locationSet.add(normalizedLocation);
    uniqueLocations.push(normalizedLocation);

    if (uniqueLocations.length >= MAX_AVAILABLE_LOCATION_PILLS) {
      break;
    }
  }

  return uniqueLocations;
});
const availableLocationsMeasureRef = ref<HTMLElement | null>(null);
const availableLocationMeasurePillRefs = ref<(HTMLElement | null)[]>([]);
const visibleAvailableLocationCount = ref(0);
const hasMeasuredAvailableLocations = ref(false);
const visibleAvailableLocations = computed(() =>
  availableLocations.value.slice(0, visibleAvailableLocationCount.value),
);

const setMeasurePillRef = (index: number, element: unknown): void => {
  availableLocationMeasurePillRefs.value[index] =
    element instanceof HTMLElement ? element : null;
};

const syncVisibleAvailableLocations = (): void => {
  const measureRow = availableLocationsMeasureRef.value;

  if (!measureRow) {
    visibleAvailableLocationCount.value = 0;
    hasMeasuredAvailableLocations.value = true;
    return;
  }

  const rowWidth = measureRow.clientWidth;
  let fitCount = 0;

  for (const pill of availableLocationMeasurePillRefs.value.slice(
    0,
    availableLocations.value.length,
  )) {
    if (!pill) {
      break;
    }

    const pillRightEdge = pill.offsetLeft + pill.offsetWidth;
    if (pillRightEdge > rowWidth) {
      break;
    }

    fitCount += 1;
  }

  visibleAvailableLocationCount.value = fitCount;
  hasMeasuredAvailableLocations.value = true;
};

const scheduleVisibleAvailableLocationSync = async (): Promise<void> => {
  hasMeasuredAvailableLocations.value = false;
  await nextTick();
  syncVisibleAvailableLocations();
};

const poisGallery = computed(() => {
  const pois = readRecordValue(props.event, "pois");
  if (!Array.isArray(pois)) {
    return [];
  }

  const uniqueUrls = new Set<string>();
  for (const poi of pois) {
    const gallery = readRecordValue(poi, "gallery");
    for (const imageUrl of normalizeGallery(gallery)) {
      uniqueUrls.add(imageUrl);
    }
  }

  return Array.from(uniqueUrls);
});

const poisGalleryCoverImage = computed(() => poisGallery.value[0] ?? null);

const fallbackGallery = computed(() =>
  normalizeGallery(props.event.fallbackGallery),
);

const fallbackIndex = ref(0);
const activeFallbackImage = computed(() => {
  if (
    coverImage.value ||
    poisGalleryCoverImage.value ||
    fallbackGallery.value.length === 0
  ) {
    return null;
  }

  const safeIndex = fallbackIndex.value % fallbackGallery.value.length;
  return fallbackGallery.value[safeIndex] ?? null;
});

watch(fallbackGallery, () => {
  fallbackIndex.value = 0;
});

watch(
  availableLocations,
  () => {
    availableLocationMeasurePillRefs.value = [];
    visibleAvailableLocationCount.value = 0;
    void scheduleVisibleAvailableLocationSync();
  },
  {
    immediate: true,
  },
);

let fallbackTimerId: number | null = null;
let availableLocationsResizeObserver: ResizeObserver | null = null;

const clearFallbackTimer = () => {
  if (fallbackTimerId !== null) {
    window.clearInterval(fallbackTimerId);
    fallbackTimerId = null;
  }
};

watchEffect((onCleanup) => {
  if (typeof window === "undefined") {
    return;
  }

  if (
    coverImage.value ||
    poisGalleryCoverImage.value ||
    fallbackGallery.value.length <= 1
  ) {
    clearFallbackTimer();
    return;
  }

  clearFallbackTimer();
  fallbackTimerId = window.setInterval(() => {
    fallbackIndex.value =
      (fallbackIndex.value + 1) % fallbackGallery.value.length;
  }, 2200);

  onCleanup(() => {
    clearFallbackTimer();
  });
});

watch(availableLocationsMeasureRef, (measureRow) => {
  if (availableLocationsResizeObserver) {
    availableLocationsResizeObserver.disconnect();
    if (measureRow) {
      availableLocationsResizeObserver.observe(measureRow);
    }
  }

  if (measureRow) {
    void scheduleVisibleAvailableLocationSync();
  } else {
    visibleAvailableLocationCount.value = 0;
  }
});

onMounted(() => {
  if (typeof ResizeObserver !== "undefined") {
    availableLocationsResizeObserver = new ResizeObserver(() => {
      void scheduleVisibleAvailableLocationSync();
    });

    if (availableLocationsMeasureRef.value) {
      availableLocationsResizeObserver.observe(availableLocationsMeasureRef.value);
    }
  }

  void scheduleVisibleAvailableLocationSync();
});

onBeforeUnmount(() => {
  availableLocationsResizeObserver?.disconnect();
  clearFallbackTimer();
});

const handleClick = () => {
  emit("click", props.event.id);
};
</script>

<style lang="scss" scoped>
.event-card {
  display: flex;
  flex-direction: column;
  min-height: 100%;
  overflow: hidden;
  border-radius: var(--sys-radius-lg);
  border: 1px solid
    color-mix(in srgb, var(--sys-color-outline) 48%, transparent);
  background: var(--sys-color-surface-container);
  text-decoration: none;
  color: inherit;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
  @include mx.pu-elevation(3);

  &:active {
    transform: scale(0.985);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.event-cover {
  width: 100%;
  height: 148px;
  background-size: cover;
  background-position: center;

  &--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
    @include mx.pu-font(title-large);
  }
}

.event-info {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-med);
}

.event-available-locations-stack {
  position: relative;
}

.event-available-locations-row,
.event-available-locations-measure {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: var(--sys-spacing-xs);
  min-height: var(--sys-size-small);
  overflow: hidden;
}

.event-available-locations-row {
  visibility: hidden;

  &.is-ready {
    visibility: visible;
  }
}

.event-available-locations-measure {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  visibility: hidden;
  pointer-events: none;
}

.event-available-location-pill {
  @include mx.pu-font(label-small);
  display: inline-flex;
  align-items: center;
  min-height: var(--sys-size-small);
  padding: 0 calc(var(--sys-spacing-sm) - 2px);
  border-radius: 999px;
  border: 1px solid
    color-mix(in srgb, var(--sys-color-outline) 46%, transparent);
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface-variant);
  white-space: nowrap;
  flex-shrink: 0;
}

.event-title {
  @include mx.pu-font(title-large);
  color: var(--sys-color-on-surface);
  margin: 0;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.event-desc {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.event-cta {
  @include mx.pu-font(label-large);
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xs);
  margin-top: auto;
  color: var(--sys-color-primary);
}

.event-cta-icon {
  @include mx.pu-icon(medium);
}
</style>
