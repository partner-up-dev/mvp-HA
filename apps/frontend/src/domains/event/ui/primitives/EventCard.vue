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
      <FitChipGroup
        v-if="availableLocations.length > 0"
        class="event-available-locations-row"
        :items="availableLocations"
        :max-items="MAX_AVAILABLE_LOCATION_PILLS"
        gap="xs"
        tone="surface"
        size="sm"
        chip-class="event-available-location-pill"
      />
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
import { computed, onBeforeUnmount, ref, watch, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import type { AnchorEventListItem } from "@/domains/event/model/types";
import FitChipGroup from "@/shared/ui/display/FitChipGroup.vue";

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
  }

  return uniqueLocations;
});

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

let fallbackTimerId: number | null = null;

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

onBeforeUnmount(() => {
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

.event-available-locations-row {
  min-height: var(--sys-size-small);
}

:deep(.event-available-location-pill) {
  background: var(--sys-color-surface-container-high) !important;
  color: var(--sys-color-on-surface-variant) !important;
  border-color: var(--sys-color-outline-variant) !important;
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
