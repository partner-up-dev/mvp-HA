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
      <h3 class="event-title">{{ event.title }}</h3>
      <p v-if="event.description" class="event-desc">
        {{ event.description }}
      </p>
      <div class="event-meta">
        <span>
          {{ t("eventPlaza.locationCount", { count: event.locationCount }) }}
        </span>
      </div>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import { RouterLink } from "vue-router";
import type { AnchorEventListResponse } from "@/domains/event/queries/useAnchorEvents";

interface EventCardProps {
  event: AnchorEventListResponse[number];
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
  border-radius: 12px;
  overflow: hidden;
  background: var(--sys-color-surface-container);
  text-decoration: none;
  color: inherit;
  transition: transform 0.15s ease;
  min-height: 100%;

  &:active {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.event-cover {
  width: 100%;
  height: 140px;
  background-size: cover;
  background-position: center;

  &--placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
    font-size: 1.25rem;
    font-weight: 600;
  }
}

.event-info {
  padding: 0.75rem 1rem 1rem;
}

.event-title {
  font-size: 1.125rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  text-wrap: balance;
  overflow-wrap: anywhere;
}

.event-desc {
  font-size: 0.8125rem;
  color: var(--sys-color-on-surface-variant);
  margin: 0 0 0.5rem;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.event-meta {
  font-size: 0.75rem;
  color: var(--sys-color-outline);
}
</style>
