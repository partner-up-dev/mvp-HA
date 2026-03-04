<template>
  <RouterLink
    class="all-entry"
    :class="{ 'is-pressed': isPressed }"
    :to="{ name: 'event-plaza' }"
    @click="handleClick"
    @pointerdown="onPointerDown"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @pointerleave="onPointerLeave"
  >
    <div class="all-entry-copy">
      <p class="all-entry-kicker">{{ t("home.landing.eventUnitCopy.allEntryKicker") }}</p>
      <h3>{{ t("home.landing.plazaEntryTitle") }}</h3>
      <p>{{ t("home.landing.plazaEntryDescription") }}</p>
    </div>
    <span class="all-entry-action">
      {{ t("home.landing.plazaEntryAction") }}
      <span class="i-mdi:arrow-right" aria-hidden="true"></span>
    </span>
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { usePressFeedback } from "@/composables/usePressFeedback";
import { trackEvent } from "@/shared/analytics/track";

const { t } = useI18n();
const {
  isPressed,
  onPointerDown,
  onPointerUp,
  onPointerCancel,
  onPointerLeave,
} = usePressFeedback();

const handleClick = () => {
  trackEvent("home_event_all_click", {
    source: "landing_v2",
  });
  trackEvent("home_event_plaza_entry_click", {
    source: "landing",
  });
};
</script>

<style lang="scss" scoped>
.all-entry {
  @include mx.pu-motion-enter(0.72rem);
  @include mx.pu-motion-pressable(0.99);
  text-decoration: none;
  border-radius: 0;
  border: 0;
  border-top: 1px solid color-mix(in srgb, var(--sys-color-outline) 74%, transparent);
  border-bottom: 1px dashed
    color-mix(in srgb, var(--sys-color-primary) 50%, var(--sys-color-outline));
  background: transparent;
  padding: clamp(0.84rem, 2.7vw, 1.08rem) clamp(0.56rem, 2vw, 0.78rem);
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--sys-spacing-sm);
  align-items: center;
  transition:
    opacity 190ms ease,
    transform 190ms ease,
    border-color 190ms ease,
    background-color 190ms ease;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.all-entry-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  .all-entry-kicker {
    @include mx.pu-font(label-small);
    margin: 0;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: color-mix(
      in srgb,
      var(--sys-color-primary) 76%,
      var(--sys-color-on-surface)
    );
  }

  h3 {
    @include mx.pu-font(title-medium);
    margin: 0;
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(body-small);
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

.all-entry-action {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface);
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;

  span {
    @include mx.pu-icon(small);
  }
}

@media (hover: hover) and (pointer: fine) {
  .all-entry:hover {
    transform: translateX(2px);
    background: color-mix(in srgb, var(--sys-color-primary) 4%, transparent);
  }
}

@media (max-width: 768px) {
  .all-entry {
    grid-template-columns: 1fr;
    align-items: start;
  }
}
</style>
