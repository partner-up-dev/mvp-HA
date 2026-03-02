<template>
  <header class="hero">
    <p class="eyebrow">{{ t("home.title") }}</p>
    <h1>{{ t("home.landing.heroTitle") }}</h1>
    <p class="subtitle">{{ t("home.landing.heroSubtitle") }}</p>

    <div class="hero-actions">
      <RouterLink
        class="hero-action hero-action--primary"
        :to="{ name: 'event-plaza' }"
        @click="handlePrimaryClick"
      >
        {{ t("home.landing.heroPrimaryAction") }}
      </RouterLink>
      <RouterLink
        class="hero-action hero-action--secondary"
        :to="{ name: 'pr-new' }"
      >
        {{ t("home.landing.heroSecondaryAction") }}
      </RouterLink>
    </div>

    <div class="hero-art" aria-hidden="true">
      <span class="hero-art-ring"></span>
      <span class="hero-art-ring hero-art-ring--offset"></span>
      <span class="hero-art-mark">搭一把</span>
    </div>
  </header>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import { trackEvent } from "@/shared/analytics/track";

const { t } = useI18n();

const handlePrimaryClick = () => {
  trackEvent("home_hero_primary_click", {
    target: "event-plaza",
  });
};
</script>

<style lang="scss" scoped>
.hero {
  position: relative;
  overflow: clip;
  padding: clamp(2.5rem, 9vw, 4.5rem) 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.eyebrow {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

h1 {
  @include mx.pu-font(display-large);
  color: var(--sys-color-on-surface);
  margin: 0;
  max-width: 9.5ch;
  line-height: 1.02;
  text-wrap: balance;
}

.subtitle {
  @include mx.pu-font(body-large);
  color: var(--sys-color-on-surface-variant);
  max-width: 30ch;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-sm);
  z-index: 1;
}

.hero-action {
  @include mx.pu-font(label-large);
  width: fit-content;
  text-decoration: none;
  padding: 0;
  border: none;
  transition:
    color 180ms ease,
    opacity 180ms ease;

  &:active {
    opacity: 0.78;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.hero-action--primary {
  color: var(--sys-color-primary);
  text-decoration: underline;
  text-underline-offset: 0.22em;
  text-decoration-thickness: 2px;

  &::after {
    content: " \2192";
  }
}

.hero-action--secondary {
  color: var(--sys-color-on-surface-variant);
}

.hero-art {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-art-ring {
  position: absolute;
  right: -5.2rem;
  top: -1.6rem;
  width: 13.8rem;
  height: 13.8rem;
  border-radius: 999px;
  border: 1px solid
    color-mix(in srgb, var(--sys-color-primary) 28%, transparent);
}

.hero-art-ring--offset {
  right: -2.6rem;
  top: 2.2rem;
  width: 9.8rem;
  height: 9.8rem;
  border-color: color-mix(in srgb, var(--sys-color-tertiary) 25%, transparent);
}

.hero-art-mark {
  @include mx.pu-font(title-large);
  position: absolute;
  right: 0;
  top: 7rem;
  letter-spacing: 0.12em;
  color: color-mix(in srgb, var(--sys-color-outline) 35%, transparent);
}
</style>
