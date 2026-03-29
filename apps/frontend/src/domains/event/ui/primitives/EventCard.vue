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
      <div class="event-kicker-row">
        <span class="event-kicker">{{ event.type }}</span>
        <span v-if="primaryLocation" class="event-scene">
          {{ primaryLocation }}
        </span>
      </div>
      <h3 class="event-title">{{ event.title }}</h3>
      <p v-if="event.description" class="event-desc">
        {{ event.description }}
      </p>
      <div class="event-meta">
        <span v-if="locationLead" class="event-location-summary">
          {{ locationLead }}
        </span>
        <span>
          {{ t("eventPlaza.locationCount", { count: event.locationCount }) }}
        </span>
      </div>
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

interface EventCardProps {
  event: AnchorEventListItem;
}

const props = defineProps<EventCardProps>();

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
const primaryLocation = computed(() => {
  if (!Array.isArray(props.event.locationPool)) {
    return null;
  }

  for (const location of props.event.locationPool) {
    if (typeof location !== "string") {
      continue;
    }

    const normalizedLocation = location.trim();
    if (!normalizedLocation) {
      continue;
    }

    return normalizedLocation;
  }

  return null;
});
const additionalLocationCount = computed(() =>
  Math.max(props.event.locationCount - (primaryLocation.value ? 1 : 0), 0),
);
const locationLead = computed(() => {
  if (!primaryLocation.value) {
    return null;
  }

  return additionalLocationCount.value > 0
    ? t("eventPlaza.locationLeadWithMore", {
        location: primaryLocation.value,
        count: additionalLocationCount.value,
      })
    : t("eventPlaza.locationLeadSingle", {
        location: primaryLocation.value,
      });
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

const fallbackGallery = computed(() => normalizeGallery(props.event.fallbackGallery));

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
  border: 1px solid color-mix(in srgb, var(--sys-color-outline) 48%, transparent);
  background: var(--sys-color-surface-container);
  text-decoration: none;
  color: inherit;
  transition:
    transform 180ms ease,
    border-color 180ms ease,
    box-shadow 180ms ease;
  @include mx.pu-elevation(1);

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

.event-kicker-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sys-spacing-xs);
}

.event-kicker {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-secondary);
}

.event-scene {
  @include mx.pu-font(label-small);
  display: inline-flex;
  align-items: center;
  min-height: var(--sys-size-small);
  max-width: 100%;
  padding: 0 calc(var(--sys-spacing-sm) - 2px);
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--sys-color-outline) 46%, transparent);
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface-variant);
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

.event-meta {
  @include mx.pu-font(label-medium);
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs) var(--sys-spacing-sm);
  color: var(--sys-color-on-surface-variant);
}

.event-location-summary {
  color: var(--sys-color-on-surface);
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
