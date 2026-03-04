<template>
  <div class="mosaic-block">
    <RouterLink
      class="mosaic-primary"
      :class="{ 'is-pressed': isPrimaryPressed }"
      :to="primaryDestination"
      @click="handlePrimaryClick"
      @pointerdown="onPrimaryPointerDown"
      @pointerup="onPrimaryPointerUp"
      @pointercancel="onPrimaryPointerCancel"
      @pointerleave="onPrimaryPointerLeave"
    >
      <header class="mosaic-primary-head">
        <p class="mosaic-primary-kicker">{{ primaryUnit.kicker }}</p>
        <span class="mosaic-primary-tag">{{ primaryTag }}</span>
      </header>
      <h3>{{ primaryUnit.title }}</h3>
      <dl class="mosaic-primary-metrics">
        <div>
          <dt>{{ t("home.landing.eventUnitCopy.mosaicPrimaryHeatLabel") }}</dt>
          <dd>{{ primaryHeatValue }}</dd>
        </div>
        <div>
          <dt>{{ t("home.landing.eventUnitCopy.mosaicPrimaryTimeLabel") }}</dt>
          <dd>{{ primaryStartValue }}</dd>
        </div>
      </dl>
      <p class="mosaic-primary-note">{{ primaryNote }}</p>
      <span class="mosaic-primary-cta">
        {{ primaryAction }}
        <span class="i-mdi:arrow-right" aria-hidden="true"></span>
      </span>
    </RouterLink>

    <RouterLink
      class="mosaic-secondary"
      :class="{ 'is-pressed': isSecondaryPressed }"
      :to="secondaryDestination"
      @click="handleSecondaryClick"
      @pointerdown="onSecondaryPointerDown"
      @pointerup="onSecondaryPointerUp"
      @pointercancel="onSecondaryPointerCancel"
      @pointerleave="onSecondaryPointerLeave"
    >
      <p class="mosaic-secondary-kicker">{{ secondaryUnit.kicker }}</p>
      <h4>{{ secondaryUnit.title }}</h4>
      <p class="mosaic-secondary-metric-label">{{ secondaryMetricLabel }}</p>
      <p class="mosaic-secondary-metric-value">{{ secondaryMetricValue }}</p>
      <p class="mosaic-secondary-hint">
        {{ secondaryHint }}
      </p>
      <span class="mosaic-secondary-cta">
        {{ secondaryAction }}
        <span class="i-mdi:arrow-right" aria-hidden="true"></span>
      </span>
    </RouterLink>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { usePressFeedback } from "@/composables/usePressFeedback";
import { toEventDestination, type HomeEventUnitViewModel } from "@/widgets/home/home-event-units";
import { trackHomeEventUnitClick } from "@/widgets/home/event-unit-tracking";

interface HomeEventMosaicBlockProps {
  primaryUnit: HomeEventUnitViewModel;
  secondaryUnit: HomeEventUnitViewModel;
}

const props = defineProps<HomeEventMosaicBlockProps>();
const { t } = useI18n();

const {
  isPressed: isPrimaryPressed,
  onPointerDown: onPrimaryPointerDown,
  onPointerUp: onPrimaryPointerUp,
  onPointerCancel: onPrimaryPointerCancel,
  onPointerLeave: onPrimaryPointerLeave,
} = usePressFeedback();

const {
  isPressed: isSecondaryPressed,
  onPointerDown: onSecondaryPointerDown,
  onPointerUp: onSecondaryPointerUp,
  onPointerCancel: onSecondaryPointerCancel,
  onPointerLeave: onSecondaryPointerLeave,
} = usePressFeedback();

const primaryDestination = computed(() =>
  toEventDestination(props.primaryUnit.eventId),
);

const secondaryDestination = computed(() =>
  toEventDestination(props.secondaryUnit.eventId),
);

const primaryTag = computed(() => {
  if (props.primaryUnit.startsSoon) {
    return t("home.landing.eventUnitCopy.mosaicPrimaryTagSoon");
  }
  return t("home.landing.eventUnitCopy.mosaicPrimaryTagOpen");
});

const primaryHeatValue = computed(() =>
  t("home.landing.eventUnitCopy.mosaicPrimaryHeatValue", {
    count: props.primaryUnit.joinedCount,
  }),
);

const primaryStartValue = computed(() => {
  if (props.primaryUnit.nearestStartAtLabel) {
    return props.primaryUnit.nearestStartAtLabel;
  }
  return t("home.landing.eventUnitCopy.mosaicPrimaryTimeFallback");
});

const primaryNote = computed(() => {
  if (props.primaryUnit.remainingSlots !== null) {
    return t("home.landing.eventUnitCopy.mosaicPrimaryNoteSlots", {
      count: props.primaryUnit.remainingSlots,
    });
  }

  return t("home.landing.eventUnitCopy.mosaicPrimaryNoteSessions", {
    count: props.primaryUnit.activeSessionCount,
  });
});

const primaryAction = computed(() => {
  if (props.primaryUnit.startsSoon) {
    return t("home.landing.eventUnitCopy.mosaicPrimaryActionSoon");
  }
  if (props.primaryUnit.eventId !== null) {
    return t("home.landing.eventUnitCopy.mosaicPrimaryActionNormal");
  }
  return t("home.landing.eventUnitCopy.mosaicPrimaryActionFallback");
});

const secondaryMetricLabel = computed(() => {
  if (props.secondaryUnit.remainingSlots !== null) {
    return t("home.landing.eventUnitCopy.mosaicSecondaryMetricSlotsLabel");
  }
  return t("home.landing.eventUnitCopy.mosaicSecondaryMetricJoinedLabel");
});

const secondaryMetricValue = computed(() => {
  if (props.secondaryUnit.remainingSlots !== null) {
    return `${props.secondaryUnit.remainingSlots}`;
  }
  return `${props.secondaryUnit.joinedCount}`;
});

const secondaryHint = computed(() => {
  if (props.secondaryUnit.startsSoon) {
    return t("home.landing.eventUnitCopy.mosaicSecondaryHintSoon", {
      count: props.secondaryUnit.activeSessionCount,
    });
  }
  if (props.secondaryUnit.eventId !== null) {
    return t("home.landing.eventUnitCopy.mosaicSecondaryHintNormal", {
      count: props.secondaryUnit.activeSessionCount,
    });
  }
  return t("home.landing.eventUnitCopy.mosaicSecondaryHintFallback");
});

const secondaryAction = computed(() => {
  if (props.secondaryUnit.startsSoon) {
    return t("home.landing.eventUnitCopy.mosaicSecondaryActionSoon");
  }
  if (props.secondaryUnit.eventId !== null) {
    return t("home.landing.eventUnitCopy.mosaicSecondaryActionNormal");
  }
  return t("home.landing.eventUnitCopy.mosaicSecondaryActionFallback");
});

const handlePrimaryClick = () => {
  trackHomeEventUnitClick(props.primaryUnit);
};

const handleSecondaryClick = () => {
  trackHomeEventUnitClick(props.secondaryUnit);
};
</script>

<style lang="scss" scoped>
.mosaic-block {
  display: grid;
  grid-template-columns: minmax(0, 1.42fr) minmax(0, 1fr);
  gap: clamp(0.75rem, 2.5vw, 1rem);
}

.mosaic-primary,
.mosaic-secondary {
  @include mx.pu-motion-enter(0.78rem);
  @include mx.pu-motion-pressable(0.988);
  text-decoration: none;
  border: 0;
  border-radius: 0;
  background: transparent;
  transition:
    opacity 190ms ease,
    transform 190ms ease,
    border-color 190ms ease,
    background-color 190ms ease;
}

.mosaic-primary {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  padding: clamp(0.86rem, 2.8vw, 1.08rem) clamp(0.64rem, 2.2vw, 0.84rem);
  border-top: 1px solid color-mix(in srgb, var(--sys-color-outline) 74%, transparent);
  border-bottom: 1px solid
    color-mix(in srgb, var(--sys-color-primary) 30%, var(--sys-color-outline));
  border-left: 0.24rem solid
    color-mix(in srgb, var(--sys-color-primary) 56%, transparent);
}

.mosaic-primary-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
}

.mosaic-secondary {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  padding: clamp(0.72rem, 2.4vw, 0.94rem) clamp(0.56rem, 1.9vw, 0.7rem);
  border-top: 1px dashed
    color-mix(in srgb, var(--sys-color-secondary) 55%, var(--sys-color-outline));
  border-bottom: 1px solid color-mix(in srgb, var(--sys-color-outline) 72%, transparent);
  border-left: 0.2rem solid
    color-mix(in srgb, var(--sys-color-secondary) 52%, transparent);
  background:
    linear-gradient(
      145deg,
      color-mix(in srgb, var(--sys-color-secondary) 8%, transparent),
      transparent 74%
    ),
    transparent;
}

.mosaic-primary-kicker {
  @include mx.pu-font(label-small);
  margin: 0;
  color: color-mix(in srgb, var(--sys-color-primary) 74%, var(--sys-color-on-surface));
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.mosaic-primary-tag {
  @include mx.pu-font(label-small);
  border-radius: 999px;
  border: 1px dashed
    color-mix(in srgb, var(--sys-color-primary) 42%, var(--sys-color-outline));
  background: transparent;
  color: color-mix(in srgb, var(--sys-color-primary) 82%, var(--sys-color-on-surface));
  padding: 0.1rem 0.42rem;
}

.mosaic-primary h3 {
  @include mx.pu-font(title-medium);
  margin: 0;
  color: var(--sys-color-on-surface);
  text-wrap: balance;
}

.mosaic-secondary h4 {
  @include mx.pu-font(title-small);
  margin: 0;
  color: var(--sys-color-on-surface);
  text-wrap: balance;
}

.mosaic-primary-metrics {
  margin: 0;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.5rem;

  div {
    min-width: 0;
    border-radius: 0;
    border: 0;
    border-left: 1px solid color-mix(in srgb, var(--sys-color-outline) 75%, transparent);
    padding: 0.2rem 0.36rem;
    display: grid;
    gap: 0.14rem;
  }

  dt {
    @include mx.pu-font(label-small);
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }

  dd {
    @include mx.pu-font(label-medium);
    margin: 0;
    color: var(--sys-color-on-surface);
  }
}

.mosaic-primary-note {
  @include mx.pu-font(body-small);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.mosaic-primary-cta,
.mosaic-secondary-cta {
  @include mx.pu-font(label-medium);
  margin: 0;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  color: var(--sys-color-on-surface);

  span {
    @include mx.pu-icon(small);
  }
}

.mosaic-secondary-kicker {
  @include mx.pu-font(label-small);
  margin: 0;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: color-mix(in srgb, var(--sys-color-secondary) 75%, var(--sys-color-on-surface));
}

.mosaic-secondary-metric-label {
  @include mx.pu-font(label-small);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.mosaic-secondary-metric-value {
  @include mx.pu-font(headline-medium);
  line-height: 1;
  letter-spacing: -0.01em;
  margin: 0;
  color: color-mix(in srgb, var(--sys-color-secondary) 82%, var(--sys-color-on-surface));
}

.mosaic-secondary-hint {
  @include mx.pu-font(body-small);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

@media (hover: hover) and (pointer: fine) {
  .mosaic-primary:hover,
  .mosaic-secondary:hover {
    transform: translateX(2px);
    background: color-mix(in srgb, var(--sys-color-primary) 4%, transparent);
  }
}

@media (max-width: 768px) {
  .mosaic-block {
    display: flex;
    overflow-x: auto;
    gap: 0.72rem;
    scroll-snap-type: x proximity;
    padding-bottom: 0.12rem;
    scrollbar-width: none;

    &::-webkit-scrollbar {
      display: none;
    }
  }

  .mosaic-primary,
  .mosaic-secondary {
    scroll-snap-align: start;
    flex-shrink: 0;
  }

  .mosaic-primary {
    width: min(21.5rem, 84vw);
  }

  .mosaic-secondary {
    width: min(16.8rem, 68vw);
  }

  .mosaic-primary-metrics {
    grid-template-columns: 1fr;
  }

  .mosaic-primary h3 {
    @include mx.pu-font(title-large);
  }
}
</style>
