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
import { useInViewStagger } from "@/composables/useInViewStagger";
import { usePressFeedback } from "@/composables/usePressFeedback";
import { trackEvent } from "@/shared/analytics/track";

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
  display: inline-flex;
  align-items: center;
  margin-left: auto;

  transition:
    opacity 180ms ease,
    transform 180ms ease,
    background-color 180ms ease;

  &:active {
    opacity: 0.72;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.plaza-action {
  @include mx.pu-font(body-large);
  display: inline-flex;
  align-items: center;
  // text-decoration: underline;
  // text-underline-offset: 3px;
  color: var(--sys-color-secondary);

  .plaza-action-icon {
    margin-left: var(--sys-spacing-xs);
    display: inline-block;
    vertical-align: middle;
    @include mx.pu-icon(medium);
  }
}

@media (hover: hover) and (pointer: fine) {
  .plaza-link:hover {
    transform: translateX(2px);
    background: color-mix(in srgb, var(--sys-color-primary) 5%, transparent);
  }
}
</style>
