<template>
  <FullScreenPageScaffold
    class="anchor-event-form-recommendation-page"
    data-page="event-recommendation"
  >
    <template #header>
      <PageHeader
        :title="t('anchorEvent.formMode.recommendationPageTitle')"
        :back-fallback-to="landingFallbackRoute"
      />
    </template>

    <LoadingIndicator
      v-if="isRedirecting"
      :message="t('common.loading')"
    />

    <AnchorEventFormModeRecommendationSurface
      v-else-if="eventId !== null && routeSelection"
      :event-id="eventId"
      :location-id="routeSelection.locationId"
      :start-at="routeSelection.startAt"
      :preferences="routeSelection.preferences"
    />
  </FullScreenPageScaffold>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute, useRouter } from "vue-router";
import FullScreenPageScaffold from "@/shared/ui/layout/FullScreenPageScaffold.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import AnchorEventFormModeRecommendationSurface from "@/domains/event/ui/surfaces/AnchorEventFormModeRecommendationSurface.vue";
import { buildFormModeStartAtFromRouteParts } from "@/domains/event/model/form-mode";

type RouteSelection = {
  locationId: string;
  startAt: string;
  preferences: string[];
};

const route = useRoute();
const router = useRouter();
const { t } = useI18n();
const isRedirecting = ref(false);

const eventId = computed(() => {
  const raw = route.params.eventId;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
});

const readFirstString = (value: unknown): string | null => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }
  if (!Array.isArray(value)) {
    return null;
  }

  for (const item of value) {
    if (typeof item !== "string") {
      continue;
    }
    const normalized = item.trim();
    if (normalized.length > 0) {
      return normalized;
    }
  }

  return null;
};

const readStringList = (value: unknown): string[] => {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? [normalized] : [];
  }
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
};

const routeSelection = computed<RouteSelection | null>(() => {
  const locationId = readFirstString(route.query.l);
  const dateKey = readFirstString(route.query.d);
  const timeKey = readFirstString(route.query.t);
  if (!locationId || !dateKey || !timeKey) {
    return null;
  }

  const startAt = buildFormModeStartAtFromRouteParts(dateKey, timeKey);
  if (!startAt) {
    return null;
  }

  return {
    locationId,
    startAt,
    preferences: readStringList(route.query.p),
  };
});

const landingFallbackRoute = computed(() => ({
  name: eventId.value === null ? "event-plaza" : "anchor-event-landing",
  params:
    eventId.value === null
      ? {}
      : {
          eventId: eventId.value.toString(),
        },
}));

watch(
  [eventId, routeSelection],
  async ([id, selection]) => {
    if (id !== null && selection !== null) {
      isRedirecting.value = false;
      return;
    }

    isRedirecting.value = true;
    if (id === null) {
      await router.replace({ name: "event-plaza" });
      return;
    }

    await router.replace({
      name: "anchor-event-landing",
      params: {
        eventId: id.toString(),
      },
    });
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.anchor-event-form-recommendation-page {
  min-width: 0;
}
</style>
