<template>
  <section
    ref="entryRef"
    class="plaza-entry"
    :class="{ 'is-in-view': isInView }"
    :aria-label="t('home.landing.plazaEntryAction')"
  >
    <RouterLink
      class="plaza-link"
      :class="{ 'is-in-view': isInView, 'is-pressed': isPressed }"
      :style="itemMotionStyle(1)"
      :to="{ name: 'event-plaza' }"
      @click="handleClick"
      @pointerdown="onPointerDown"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @pointerleave="onPointerLeave"
    >
      <div class="plaza-copy">
        <span class="plaza-kicker">
          {{ t("home.landing.plazaEntryKicker") }}
        </span>
        <h3 class="plaza-title">{{ t("home.landing.plazaEntryTitle") }}</h3>
        <p class="plaza-description">
          {{ t("home.landing.plazaEntryDescription") }}
        </p>
      </div>
      <span class="plaza-action">
        {{ t("home.landing.plazaEntryAction") }}
        <span class="plaza-action-icon i-mdi:arrow-right" aria-hidden="true" />
      </span>
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useInViewStagger } from "@/shared/motion/useInViewStagger";
import { usePressFeedback } from "@/shared/motion/usePressFeedback";
import { trackEvent } from "@/shared/telemetry/track";

const { t } = useI18n();
const {
  targetRef: entryRef,
  isInView,
  itemMotionStyle,
} = useInViewStagger({
  threshold: 0.25,
  rootMargin: "0px 0px -10% 0px",
});
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
.plaza-entry {
  display: flex;
  flex-direction: column;
}

.plaza-link {
  @include mx.pu-motion-enter(0.66rem);
  @include mx.pu-motion-pressable(0.992);
  @include mx.pu-motion-ripple-base();
  text-decoration: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-med);
  border-radius: var(--sys-radius-med);
  border: 1px solid color-mix(in srgb, var(--sys-color-outline) 52%, transparent);
  background: color-mix(
    in srgb,
    var(--sys-color-surface-container-low) 78%,
    transparent
  );

  transition:
    opacity 180ms ease,
    transform 180ms ease,
    background-color 180ms ease,
    border-color 180ms ease;

  &:active {
    opacity: 0.72;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.plaza-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.plaza-kicker {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-secondary);
}

.plaza-title {
  @include mx.pu-font(title-large);
  color: var(--sys-color-on-surface);
  margin: 0;
}

.plaza-description {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
  max-width: 36ch;
}

.plaza-action {
  @include mx.pu-font(label-large);
  display: inline-flex;
  align-items: center;
  color: var(--sys-color-primary);
  flex-shrink: 0;

  .plaza-action-icon {
    margin-left: var(--sys-spacing-xs);
    display: inline-block;
    vertical-align: middle;
    @include mx.pu-icon(medium);
  }
}

@media (hover: hover) and (pointer: fine) {
  .plaza-link:hover {
    transform: translateY(-1px);
    border-color: color-mix(in srgb, var(--sys-color-primary) 44%, transparent);
    background: color-mix(
      in srgb,
      var(--sys-color-primary-container) 24%,
      var(--sys-color-surface-container-low)
    );
  }
}

@media (max-width: 768px) {
  .plaza-link {
    grid-template-columns: 1fr;
    align-items: flex-start;
  }
}
</style>
