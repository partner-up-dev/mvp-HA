<template>
  <RouterLink
    class="focus-block"
    :class="{ 'is-pressed': isPressed }"
    :to="destination"
    @click="handleClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @pointerleave="onPointerLeave"
  >
    <div class="focus-rail" aria-hidden="true">
      <span :class="['focus-icon', unit.iconClass]"></span>
    </div>

    <div class="focus-main">
      <p class="focus-kicker">
        {{ unit.kicker }}
        <span class="focus-badge">{{ t("home.landing.eventUnitCopy.focusBadge") }}</span>
      </p>
      <h3>{{ unit.title }}</h3>
      <p class="focus-prompt">{{ focusPrompt }}</p>
      <div class="focus-stats">
        <p>{{ focusSlots }}</p>
        <p>{{ focusSessions }}</p>
      </div>
    </div>

    <div class="focus-action">
      <span class="focus-action-text">
        {{ focusAction }}
        <span class="i-mdi:arrow-right" aria-hidden="true"></span>
      </span>
    </div>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { usePressFeedback } from "@/composables/usePressFeedback";
import { toEventDestination, type HomeEventUnitViewModel } from "@/widgets/home/home-event-units";
import { trackHomeEventUnitClick } from "@/widgets/home/event-unit-tracking";

interface HomeEventFocusBlockProps {
  unit: HomeEventUnitViewModel;
}

const props = defineProps<HomeEventFocusBlockProps>();
const { t } = useI18n();
const {
  isPressed,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
} = usePressFeedback();

const destination = computed(() => toEventDestination(props.unit.eventId));

const focusPrompt = computed(() => {
  if (props.unit.startsSoon && props.unit.nearestStartAtLabel) {
    return t("home.landing.eventUnitCopy.focusPromptSoon", {
      time: props.unit.nearestStartAtLabel,
    });
  }

  if (props.unit.eventId !== null) {
    return t("home.landing.eventUnitCopy.focusPromptOpen", {
      count: props.unit.activeSessionCount,
    });
  }

  return t("home.landing.eventUnitCopy.focusPromptFallback");
});

const focusSlots = computed(() => {
  if (props.unit.remainingSlots !== null) {
    return t("home.landing.eventUnitCopy.focusSlots", {
      count: props.unit.remainingSlots,
    });
  }
  return t("home.landing.eventUnitCopy.focusSlotsFallback");
});

const focusSessions = computed(() =>
  t("home.landing.eventUnitCopy.focusSessions", {
    count: props.unit.activeSessionCount,
  }),
);

const focusAction = computed(() => {
  if (props.unit.startsSoon) {
    return t("home.landing.eventUnitCopy.focusActionSoon");
  }

  if (props.unit.eventId !== null) {
    return t("home.landing.eventUnitCopy.focusActionNormal");
  }

  return t("home.landing.eventUnitCopy.focusActionFallback");
});

const handleClick = () => {
  trackHomeEventUnitClick(props.unit);
};
</script>

<style lang="scss" scoped>
.focus-block {
  @include mx.pu-motion-enter(0.74rem);
  @include mx.pu-motion-pressable(0.988);
  text-decoration: none;
  border: 0;
  border-radius: 0;
  border-top: 1px dashed
    color-mix(in srgb, var(--sys-color-tertiary) 58%, var(--sys-color-outline));
  border-bottom: 1px solid color-mix(in srgb, var(--sys-color-outline) 74%, transparent);
  background: transparent;
  padding: clamp(0.72rem, 2.4vw, 0.96rem) clamp(0.62rem, 2vw, 0.82rem);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 0.72rem;
  transition:
    opacity 190ms ease,
    transform 190ms ease,
    border-color 190ms ease,
    background-color 190ms ease;

  h3 {
    @include mx.pu-font(title-large);
    margin: 0;
    color: var(--sys-color-on-surface);
    text-wrap: balance;
  }
}

.focus-rail {
  width: clamp(2.1rem, 4.4vw, 2.55rem);
  border-radius: 0;
  border: 0;
  border-left: 2px solid
    color-mix(in srgb, var(--sys-color-tertiary) 56%, var(--sys-color-outline));
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--sys-color-tertiary) 16%, transparent),
      transparent 76%
    ),
    transparent;
  display: grid;
  place-items: center;
}

.focus-kicker {
  @include mx.pu-font(label-small);
  margin: 0;
  color: color-mix(
    in srgb,
    var(--sys-color-tertiary) 72%,
    var(--sys-color-on-surface)
  );
  letter-spacing: 0.06em;
  text-transform: uppercase;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.focus-badge {
  @include mx.pu-font(label-small);
  border: 1px solid
    color-mix(in srgb, var(--sys-color-tertiary) 48%, var(--sys-color-outline));
  border-radius: 999px;
  padding: 0.1rem 0.35rem;
  background: color-mix(in srgb, var(--sys-color-tertiary) 12%, transparent);
}

.focus-icon {
  @include mx.pu-icon(small);
  color: color-mix(
    in srgb,
    var(--sys-color-tertiary) 72%,
    var(--sys-color-on-surface)
  );
}

.focus-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.38rem;
}

.focus-prompt {
  @include mx.pu-font(body-small);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.focus-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.42rem;
  margin-top: 0.12rem;

  p {
    @include mx.pu-font(label-small);
    margin: 0;
    padding: 0.16rem 0.4rem;
    border-radius: 999px;
    border: 1px solid
      color-mix(in srgb, var(--sys-color-outline) 70%, transparent);
    background: color-mix(
      in srgb,
      var(--sys-color-surface-container-low) 80%,
      transparent
    );
    color: var(--sys-color-on-surface);
  }
}

.focus-action {
  display: flex;
  align-items: center;
}

.focus-action-text {
  @include mx.pu-font(label-large);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: color-mix(
    in srgb,
    var(--sys-color-tertiary) 74%,
    var(--sys-color-on-surface)
  );
  border-radius: 0;
  border: 0;
  border-bottom: 1px solid
    color-mix(in srgb, var(--sys-color-tertiary) 58%, var(--sys-color-outline));
  padding: 0.2rem 0;

  span {
    @include mx.pu-icon(small);
  }
}

@media (hover: hover) and (pointer: fine) {
  .focus-block:hover {
    transform: translateX(2px);
    background: color-mix(in srgb, var(--sys-color-tertiary) 5%, transparent);
  }
}

@media (max-width: 768px) {
  .focus-block {
    grid-template-columns: minmax(0, 1fr);
    gap: 0.56rem;
  }

  .focus-rail {
    width: 100%;
    min-height: 2rem;
  }

  .focus-block h3 {
    @include mx.pu-font(title-medium);
  }

  .focus-action {
    justify-content: flex-start;
  }
}
</style>
