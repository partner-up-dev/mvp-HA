<template>
  <section
    ref="entryRef"
    class="plaza-entry"
    :class="{ 'is-in-view': isInView }"
    :aria-label="t('home.landing.plazaEntryAction')"
  >
    <p
      class="plaza-text"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(1)"
    >
      <span class="plaza-kicker">{{ t("home.landing.plazaEntryKicker") }}</span>
      <span class="plaza-title">{{ t("home.landing.plazaEntryTitle") }}</span>
      <span class="plaza-description">
        {{ t("home.landing.plazaEntryDescription") }}
      </span>
    </p>

    <RouterLink
      class="plaza-action-link"
      :class="{ 'is-in-view': isInView }"
      :style="itemMotionStyle(2)"
      :to="{ name: 'event-plaza' }"
      @click="handleClick"
    >
      {{ t("home.landing.plazaEntryAction") }}
      <span class="plaza-action-icon i-mdi:arrow-right" aria-hidden="true" />
    </RouterLink>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { useInViewStagger } from "@/shared/motion/useInViewStagger";
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
  align-items: flex-start;
  gap: var(--sys-spacing-xs);
}

.plaza-text,
.plaza-action-link {
  @include mx.pu-motion-enter(0.66rem);
}

.plaza-text {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
  max-width: 42ch;
}

.plaza-kicker {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-secondary);
  margin-right: var(--sys-spacing-xs);
}

.plaza-title {
  color: var(--sys-color-on-surface);
  margin-right: var(--sys-spacing-xs);
}

.plaza-description {
  color: inherit;
}

.plaza-action-link {
  @include mx.pu-font(body-medium);
  display: inline-flex;
  align-items: center;
  color: var(--sys-color-secondary);
  text-decoration: none;
  transition:
    color 180ms ease,
    transform 180ms ease;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.plaza-action-icon {
  margin-left: var(--sys-spacing-xs);
  display: inline-block;
  vertical-align: middle;
  @include mx.pu-icon(medium);
}

@media (hover: hover) and (pointer: fine) {
  .plaza-action-link:hover {
    transform: translateX(2px);
    color: var(--sys-color-primary);
  }
}
</style>
