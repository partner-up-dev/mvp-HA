<template>
  <section
    class="event-slide event-slide--one"
    aria-labelledby="home-event-gateway"
  >
    <RouterLink
      id="home-event-gateway"
      class="event-gateway"
      :class="{ 'event-gateway--flash': shouldFlashGateway }"
      :to="{ name: 'event-plaza' }"
      @click="handleGatewayClick"
    >
      <span class="event-gateway-copy">
        {{ t("home.landing.eventCampaigns.gatewayAction") }}
      </span>
      <span
        class="event-gateway-icon i-mdi:arrow-right"
        aria-hidden="true"
      ></span>
    </RouterLink>

    <div class="event-half-stack">
      <HomeEventBadmintonHalf :campaign="badminton" />
      <HomeEventRunningHalf :campaign="running" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import HomeEventBadmintonHalf from "@/widgets/home/HomeEventBadmintonHalf.vue";
import HomeEventRunningHalf from "@/widgets/home/HomeEventRunningHalf.vue";
import { trackEvent } from "@/shared/analytics/track";
import type { HomeEventCampaignViewModel } from "@/composables/useHomeEventCampaignData";

const GATEWAY_FLASH_DURATION_MS = 820;

interface HomeEventSlideOneProps {
  badminton: HomeEventCampaignViewModel;
  running: HomeEventCampaignViewModel;
}

defineProps<HomeEventSlideOneProps>();

const { t } = useI18n();
const shouldFlashGateway = ref(true);
let flashTimerId: number | null = null;

const handleGatewayClick = () => {
  trackEvent("home_event_plaza_entry_click", {
    source: "landing",
  });
};

onMounted(() => {
  if (typeof window === "undefined") {
    return;
  }

  flashTimerId = window.setTimeout(() => {
    shouldFlashGateway.value = false;
    flashTimerId = null;
  }, GATEWAY_FLASH_DURATION_MS);
});

onUnmounted(() => {
  if (typeof window === "undefined") {
    return;
  }

  if (flashTimerId !== null) {
    window.clearTimeout(flashTimerId);
    flashTimerId = null;
  }
});
</script>

<style lang="scss" scoped>
.event-slide {
  height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: clamp(0.78rem, 2.8vw, 1rem);
}

.event-gateway {
  @include mx.pu-font(body-large);
  min-height: 2.75rem;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  text-decoration: none;
  color: var(--sys-color-on-surface);
  padding: 0.62rem 0.88rem;
  border-radius: var(--sys-radius-med);
  border: 1px solid var(--sys-color-outline);
  background: transparent;
  transition:
    border-color 220ms ease,
    transform 220ms ease,
    box-shadow 220ms ease;

  &:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--sys-color-primary) 44%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.event-gateway--flash {
  animation: gateway-gradient-flash 820ms cubic-bezier(0.22, 0.65, 0.2, 1) 1;
}

.event-gateway-copy {
  text-wrap: balance;
}

.event-gateway-icon {
  @include mx.pu-icon(medium);
  flex-shrink: 0;
}

.event-half-stack {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.event-half-stack > :deep(*) {
  flex: 1;
}

@keyframes gateway-gradient-flash {
  0% {
    box-shadow: 0 0 0 0 color-mix(in srgb, #ffcb5c 0%, transparent);
    filter: saturate(1);
  }
  28% {
    box-shadow: 0 0 0.9rem 0.08rem color-mix(in srgb, #ffcb5c 36%, transparent);
    filter: saturate(1.12);
  }
  100% {
    box-shadow: 0 0 0 0 color-mix(in srgb, #ffcb5c 0%, transparent);
    filter: saturate(1);
  }
}

@media (max-width: 768px) {
  .event-gateway {
    @include mx.pu-font(body-medium);
  }
}

@media (prefers-reduced-motion: reduce) {
  .event-gateway,
  .event-gateway--flash {
    transition: none !important;
    animation: none !important;
  }
}
</style>
