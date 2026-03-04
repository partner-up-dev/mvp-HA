<template>
  <RouterLink
    class="lead-block"
    :class="{ 'is-pressed': isPressed }"
    :to="destination"
    @click="handleClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @pointerleave="onPointerLeave"
  >
    <div class="lead-main">
      <p class="lead-kicker">
        {{ unit.kicker }}
        <span class="lead-badge">{{ t("home.landing.eventUnitCopy.leadBadge") }}</span>
      </p>
      <h3>{{ unit.title }}</h3>
      <p class="lead-description">{{ unit.description }}</p>
      <ul class="lead-metrics">
        <li>
          <span class="i-mdi:account-group" aria-hidden="true"></span>
          {{ joinedLabel }}
        </li>
        <li>
          <span class="i-mdi:calendar-clock" aria-hidden="true"></span>
          {{ urgencyLabel }}
        </li>
        <li>
          <span class="i-mdi:ticket-confirmation" aria-hidden="true"></span>
          {{ scarcityLabel }}
        </li>
      </ul>
    </div>

    <aside class="lead-side">
      <span class="lead-side-kicker">{{ sideKicker }}</span>
      <span class="lead-side-value">{{ sideValue }}</span>
      <span class="lead-side-hint">{{ sideHint }}</span>
      <span class="lead-cta">
        {{ actionLabel }}
        <span class="lead-cta-icon i-mdi:arrow-right" aria-hidden="true"></span>
      </span>
    </aside>
  </RouterLink>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { usePressFeedback } from "@/composables/usePressFeedback";
import { toEventDestination, type HomeEventUnitViewModel } from "@/widgets/home/home-event-units";
import { trackHomeEventUnitClick } from "@/widgets/home/event-unit-tracking";

interface HomeEventLeadBlockProps {
  unit: HomeEventUnitViewModel;
}

const props = defineProps<HomeEventLeadBlockProps>();
const { t } = useI18n();
const {
  isPressed,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
} = usePressFeedback();

const destination = computed(() => toEventDestination(props.unit.eventId));

const joinedLabel = computed(() =>
  t("home.landing.eventUnitCopy.leadJoinedStat", {
    count: props.unit.joinedCount,
  }),
);

const urgencyLabel = computed(() => {
  if (props.unit.nearestStartAtLabel) {
    return t("home.landing.eventUnitCopy.leadUrgencyAt", {
      time: props.unit.nearestStartAtLabel,
    });
  }

  return t("home.landing.eventUnitCopy.leadUrgencyFallback");
});

const scarcityLabel = computed(() => {
  if (props.unit.remainingSlots !== null) {
    return t("home.landing.eventUnitCopy.leadScarcitySlots", {
      count: props.unit.remainingSlots,
    });
  }

  return t("home.landing.eventUnitCopy.leadScarcityFallback");
});

const sideKicker = computed(() => {
  if (props.unit.remainingSlots !== null) {
    return t("home.landing.eventUnitCopy.leadSideSlots");
  }
  return t("home.landing.eventUnitCopy.leadSideHeat");
});

const sideValue = computed(() => {
  if (props.unit.remainingSlots !== null) {
    return `${props.unit.remainingSlots}`;
  }
  return `${props.unit.joinedCount}`;
});

const sideHint = computed(() => {
  return t("home.landing.eventUnitCopy.leadSideSessions", {
    count: props.unit.activeSessionCount,
  });
});

const actionLabel = computed(() => {
  if (props.unit.startsSoon) {
    return t("home.landing.eventUnitCopy.leadActionSoon");
  }
  if (props.unit.eventId !== null) {
    return t("home.landing.eventUnitCopy.leadActionNormal");
  }
  return t("home.landing.eventUnitCopy.leadActionFallback");
});

const handleClick = () => {
  trackHomeEventUnitClick(props.unit);
};
</script>

<style lang="scss" scoped>
.lead-block {
  @include mx.pu-motion-enter(0.92rem);
  @include mx.pu-motion-pressable(0.985);
  min-width: 0;
  text-decoration: none;
  border-radius: 0;
  border: 0;
  background: transparent;
  border-left: 0.28rem solid
    color-mix(in srgb, var(--sys-color-primary) 58%, transparent);
  border-top: 1px solid color-mix(in srgb, var(--sys-color-outline) 75%, transparent);
  border-bottom: 1px solid
    color-mix(in srgb, var(--sys-color-primary) 28%, var(--sys-color-outline));
  padding: clamp(0.86rem, 3vw, 1.3rem) clamp(0.7rem, 2.2vw, 1rem);
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(6.8rem, 0.72fr);
  gap: clamp(0.8rem, 2.6vw, 1.1rem);
  align-items: stretch;
  transition:
    opacity 220ms ease,
    transform 220ms ease,
    border-color 220ms ease,
    background-color 220ms ease;

  &:active {
    transform: scale(0.985);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 3px;
  }
}

@media (hover: hover) and (pointer: fine) {
  .lead-block:hover {
    transform: translateX(2px);
    border-left-color: color-mix(in srgb, var(--sys-color-primary) 88%, transparent);
    background: color-mix(in srgb, var(--sys-color-primary) 5%, transparent);
  }
}

.lead-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h3 {
    @include mx.pu-font(headline-small);
    margin: 0;
    color: var(--sys-color-on-surface);
    text-wrap: balance;
  }
}

.lead-kicker {
  @include mx.pu-font(label-medium);
  margin: 0;
  color: color-mix(in srgb, var(--sys-color-primary) 82%, var(--sys-color-on-surface));
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.lead-badge {
  @include mx.pu-font(label-small);
  padding: 0.12rem 0.4rem;
  border-radius: 999px;
  border: 1px solid
    color-mix(in srgb, var(--sys-color-primary) 50%, var(--sys-color-outline));
  background: color-mix(in srgb, var(--sys-color-primary) 12%, transparent);
}

.lead-description {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
  max-width: 30ch;
}

.lead-metrics {
  list-style: none;
  margin: var(--sys-spacing-xs) 0 0;
  padding: 0;
  display: grid;
  gap: 0.42rem;

  li {
    @include mx.pu-font(label-medium);
    min-width: 0;
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 0.36rem;
    width: fit-content;
    max-width: 100%;
    color: var(--sys-color-on-surface);
    border-radius: 999px;
    padding: 0.18rem 0.48rem;
    border: 1px solid
      color-mix(in srgb, var(--sys-color-outline) 68%, transparent);
    background: color-mix(
      in srgb,
      var(--sys-color-surface-container-low) 74%,
      transparent
    );

    span {
      @include mx.pu-icon(small);
      color: color-mix(
        in srgb,
        var(--sys-color-primary) 78%,
        var(--sys-color-on-surface)
      );
      flex-shrink: 0;
    }
  }
}

.lead-side {
  border-radius: 0;
  padding: clamp(0.64rem, 2vw, 0.84rem) clamp(0.56rem, 1.9vw, 0.76rem);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 0.45rem;
  background: color-mix(in srgb, var(--sys-color-primary) 7%, transparent);
  border: 0;
  border-left: 1px dashed
    color-mix(in srgb, var(--sys-color-primary) 46%, var(--sys-color-outline));
}

.lead-side-kicker {
  @include mx.pu-font(label-small);
  color: color-mix(in srgb, var(--sys-color-primary) 80%, var(--sys-color-on-surface));
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.lead-side-value {
  @include mx.pu-font(headline-medium);
  line-height: 1;
  letter-spacing: -0.02em;
  color: color-mix(in srgb, var(--sys-color-primary) 78%, var(--sys-color-on-surface));
}

.lead-side-hint {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
}

.lead-cta {
  @include mx.pu-font(label-large);
  margin-top: var(--sys-spacing-xs);
  color: color-mix(in srgb, var(--sys-color-primary) 80%, var(--sys-color-on-surface));
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.lead-cta-icon {
  @include mx.pu-icon(small);
}

@media (max-width: 768px) {
  .lead-block {
    grid-template-columns: 1fr;
    align-items: start;
    gap: var(--sys-spacing-sm);
  }

  .lead-main h3 {
    @include mx.pu-font(title-large);
  }

  .lead-side {
    display: grid;
    grid-template-columns: auto auto 1fr;
    align-items: center;
    column-gap: var(--sys-spacing-sm);
    row-gap: 0.2rem;
  }

  .lead-side-value {
    @include mx.pu-font(headline-medium);
  }

  .lead-side-hint {
    grid-column: 1 / -1;
  }

  .lead-cta {
    @include mx.pu-font(label-large);
    grid-column: 1 / -1;
  }
}
</style>
