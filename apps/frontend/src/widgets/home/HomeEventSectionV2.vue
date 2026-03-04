<template>
  <section
    ref="sectionRef"
    class="event-section-v2"
    :class="{ 'is-in-view': isInView }"
    aria-labelledby="home-event-v2-title"
  >
    <header class="event-header">
      <div class="event-header-copy">
        <h2 id="home-event-v2-title">{{ t("home.landing.highlightsTitle") }}</h2>
        <p>{{ eventHeaderHint }}</p>
      </div>
    </header>

    <HomeEventLiveStrip
      class="event-live-strip"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(0)"
      :joined-count="joinedTotal"
      :active-session-count="activeSessionTotal"
      :starts-soon-count="startsSoonCount"
      :next-start-label="nextStartLabel"
    />

    <HomeEventLeadBlock
      class="event-lead-block"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
      :unit="leadUnitView"
    />

    <HomeEventMosaicBlock
      class="event-mosaic-block"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(2)"
      :primary-unit="mosaicPrimaryView"
      :secondary-unit="mosaicSecondaryView"
    />

    <HomeEventFocusBlock
      class="event-focus-block"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(3)"
      :unit="focusUnitView"
    />

    <HomeEventAllEntry
      class="event-all-entry"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(4)"
    />
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useI18n } from "vue-i18n";
import HomeEventLiveStrip from "@/widgets/home/HomeEventLiveStrip.vue";
import HomeEventLeadBlock from "@/widgets/home/HomeEventLeadBlock.vue";
import HomeEventMosaicBlock from "@/widgets/home/HomeEventMosaicBlock.vue";
import HomeEventFocusBlock from "@/widgets/home/HomeEventFocusBlock.vue";
import HomeEventAllEntry from "@/widgets/home/HomeEventAllEntry.vue";
import {
  useHomeEventUnitData,
  type HomeEventUnitData,
} from "@/composables/useHomeEventUnitData";
import { trackEvent } from "@/shared/analytics/track";
import type { HomeEventUnitViewModel } from "@/widgets/home/home-event-units";
import { useInViewStagger } from "@/composables/useInViewStagger";

const { t } = useI18n();
const { leadUnit, subUnits, hasAtLeastOneMappedUnit } = useHomeEventUnitData();
const { targetRef: sectionRef, isInView, itemMotionStyle } = useInViewStagger();

const hasTrackedSectionImpression = ref(false);
const trackedCardImpressionKeyMap = ref<
  Record<HomeEventUnitData["key"], boolean>
>({
  badminton: false,
  running: false,
  teaTalk: false,
  speaking: false,
});

const unitAnalyticsIndexMap: Record<HomeEventUnitData["key"], number> = {
  badminton: 0,
  running: 1,
  teaTalk: 2,
  speaking: 3,
};

const displayedUnits = computed<HomeEventUnitData[]>(() => {
  const mosaicPrimary = subUnits.value[0] ?? leadUnit.value;
  const mosaicSecondary = subUnits.value[1] ?? mosaicPrimary;
  const focusUnit = subUnits.value[2] ?? mosaicSecondary;
  return [leadUnit.value, mosaicPrimary, mosaicSecondary, focusUnit];
});

const getUnitTitle = (unit: HomeEventUnitData): string => {
  if (unit.key === "running") {
    return t("home.landing.eventCampaigns.running.titleWithLocation", {
      location: unit.locations[0] ?? t("home.landing.eventCampaigns.running.fallbackLocation"),
    });
  }

  if (unit.key === "badminton") {
    return t("home.landing.eventCampaigns.badminton.title");
  }

  if (unit.key === "teaTalk") {
    return t("home.landing.eventCampaigns.teaTalk.title");
  }

  return t("home.landing.eventCampaigns.speaking.title");
};

const getUnitDescription = (unit: HomeEventUnitData): string => {
  if (unit.eventId === null) {
    return t("home.landing.eventUnitCopy.fallbackUpdating");
  }

  if (unit.joinedCount > 0) {
    return t("home.landing.eventUnitCopy.proofWithCount", {
      count: unit.joinedCount,
    });
  }

  if (unit.activeSessionCount > 0) {
    return t("home.landing.eventUnitCopy.sessionsWithCount", {
      count: unit.activeSessionCount,
    });
  }

  if (unit.key === "badminton") {
    return t("home.landing.eventCampaigns.badminton.description");
  }
  if (unit.key === "running") {
    return t("home.landing.eventCampaigns.running.description");
  }
  if (unit.key === "teaTalk") {
    return t("home.landing.eventCampaigns.teaTalk.description");
  }
  return t("home.landing.eventCampaigns.speaking.description");
};

const getUnitMetaLabel = (unit: HomeEventUnitData): string | null => {
  if (unit.remainingSlots !== null) {
    return t("home.landing.eventUnitCopy.remainingSlotsWithCount", {
      count: unit.remainingSlots,
    });
  }

  if (unit.nearestStartAtLabel) {
    return t("home.landing.eventUnitCopy.startsAtWithTime", {
      time: unit.nearestStartAtLabel,
    });
  }

  return null;
};

const getUnitCtaLabel = (unit: HomeEventUnitData): string => {
  if (unit.startsSoon) {
    return t("home.landing.eventUnitCopy.joinSoon");
  }
  if (unit.eventId !== null) {
    return t("home.landing.eventUnitCopy.joinNow");
  }
  return t("home.landing.eventCampaigns.gatewayAction");
};

const getUnitIcon = (key: HomeEventUnitData["key"]): string => {
  if (key === "badminton") return "i-mdi:badminton";
  if (key === "running") return "i-mdi:run-fast";
  if (key === "teaTalk") return "i-mdi:tea";
  return "i-mdi:account-voice";
};

const getUnitKicker = (key: HomeEventUnitData["key"]): string => {
  if (key === "badminton") return t("home.landing.eventCampaigns.badminton.kicker");
  if (key === "running") return t("home.landing.eventCampaigns.running.kicker");
  if (key === "teaTalk") return t("home.landing.eventCampaigns.teaTalk.kicker");
  return t("home.landing.eventCampaigns.speaking.kicker");
};

const toUnitViewModel = (unit: HomeEventUnitData): HomeEventUnitViewModel => {
  return {
    key: unit.key,
    eventId: unit.eventId,
    analyticsIndex: unitAnalyticsIndexMap[unit.key],
    isLead: unit.key === leadUnit.value.key,
    joinedCount: unit.joinedCount,
    activeSessionCount: unit.activeSessionCount,
    remainingSlots: unit.remainingSlots,
    nearestStartAtLabel: unit.nearestStartAtLabel,
    startsSoon: unit.startsSoon,
    kicker: getUnitKicker(unit.key),
    title: getUnitTitle(unit),
    description: getUnitDescription(unit),
    ctaLabel: getUnitCtaLabel(unit),
    metaLabel: getUnitMetaLabel(unit),
    iconClass: getUnitIcon(unit.key),
  };
};

const leadUnitView = computed(() => toUnitViewModel(leadUnit.value));
const mosaicPrimaryView = computed(() =>
  toUnitViewModel(subUnits.value[0] ?? leadUnit.value),
);
const mosaicSecondaryView = computed(() =>
  toUnitViewModel(subUnits.value[1] ?? subUnits.value[0] ?? leadUnit.value),
);
const focusUnitView = computed(() =>
  toUnitViewModel(
    subUnits.value[2] ?? subUnits.value[1] ?? subUnits.value[0] ?? leadUnit.value,
  ),
);

const joinedTotal = computed(() =>
  displayedUnits.value.reduce((total, unit) => total + unit.joinedCount, 0),
);
const activeSessionTotal = computed(() =>
  displayedUnits.value.reduce((total, unit) => total + unit.activeSessionCount, 0),
);
const startsSoonCount = computed(
  () => displayedUnits.value.filter((unit) => unit.startsSoon).length,
);

const nextStartLabel = computed(() => {
  const candidate = displayedUnits.value.find(
    (unit) => unit.nearestStartAtLabel !== null,
  );
  return candidate?.nearestStartAtLabel ?? null;
});

const eventHeaderHint = computed(() => {
  if (startsSoonCount.value > 0) {
    return t("home.landing.eventUnitCopy.sectionHintSoon", {
      count: startsSoonCount.value,
    });
  }

  if (activeSessionTotal.value > 0) {
    return t("home.landing.eventUnitCopy.sectionHintOpen", {
      count: activeSessionTotal.value,
    });
  }

  return t("home.landing.highlightsSubtitle");
});

watchEffect(() => {
  if (!isInView.value) {
    return;
  }

  if (!hasTrackedSectionImpression.value) {
    hasTrackedSectionImpression.value = true;
    trackEvent("home_event_section_impression", {
      source: "landing_v2",
      hasMappedUnit: hasAtLeastOneMappedUnit.value,
      unitCount: displayedUnits.value.length,
    });
  }

  for (const unit of displayedUnits.value) {
    if (trackedCardImpressionKeyMap.value[unit.key]) {
      continue;
    }
    if (unit.isLoading) {
      continue;
    }

    trackedCardImpressionKeyMap.value[unit.key] = true;
    trackEvent("home_event_card_impression", {
      unitKey: unit.key,
      isLead: unit.key === leadUnit.value.key,
      remainingSlots: unit.remainingSlots,
      startsSoon: unit.startsSoon,
      eventId: unit.eventId ?? undefined,
    });
  }
});
</script>

<style lang="scss" scoped>
.event-section-v2 {
  width: 100%;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.88rem, 3.1vw, 1.28rem);
  @include mx.pu-motion-enter(0.8rem);
}

.event-header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.event-live-strip {
  margin-bottom: clamp(0.12rem, 0.8vw, 0.26rem);
}

.event-lead-block {
  margin-bottom: clamp(0.4rem, 2vw, 0.86rem);
}

.event-mosaic-block {
  margin-bottom: clamp(0.2rem, 1.1vw, 0.44rem);
}

.event-focus-block {
  margin-bottom: clamp(0.5rem, 2.2vw, 0.92rem);
}

.event-header-copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2 {
    @include mx.pu-font(headline-small);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    margin: 0;
    color: var(--sys-color-on-surface-variant);
    max-width: 32ch;
  }
}

@media (max-width: 768px) {
  .event-header-copy h2 {
    @include mx.pu-font(title-large);
  }

  .event-header-copy p {
    @include mx.pu-font(body-large);
  }
}
</style>
