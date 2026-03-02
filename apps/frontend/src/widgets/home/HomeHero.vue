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
      <span class="hero-art-circle hero-art-circle--primary"></span>
      <span class="hero-art-circle hero-art-circle--secondary"></span>
      <span class="hero-art-grid"></span>
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
  overflow: hidden;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background:
    radial-gradient(
      circle at 85% -10%,
      color-mix(in srgb, var(--sys-color-primary) 28%, transparent) 0%,
      transparent 48%
    ),
    linear-gradient(
      160deg,
      var(--sys-color-surface-container-lowest) 0%,
      var(--sys-color-surface-container) 100%
    );
  padding: var(--sys-spacing-lg) var(--sys-spacing-med);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.eyebrow {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

h1 {
  @include mx.pu-font(display-large);
  color: var(--sys-color-on-surface);
  margin: 0;
  max-width: 11ch;
  line-height: 1.1;
}

.subtitle {
  @include mx.pu-font(body-large);
  color: var(--sys-color-on-surface-variant);
  max-width: 26ch;
}

.hero-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  margin-top: var(--sys-spacing-xs);
  z-index: 1;
}

.hero-action {
  @include mx.pu-font(label-large);
  border-radius: var(--sys-radius-sm);
  text-decoration: none;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  border: 1px solid transparent;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    transform 180ms ease;

  &:active {
    transform: translateY(1px);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.hero-action--primary {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.hero-action--secondary {
  background: var(--sys-color-surface-container-lowest);
  border-color: var(--sys-color-outline-variant);
  color: var(--sys-color-on-surface);
}

.hero-art {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.hero-art-circle {
  position: absolute;
  border-radius: 999px;
  display: block;
}

.hero-art-circle--primary {
  width: 9rem;
  height: 9rem;
  right: -3rem;
  top: -2.5rem;
  background: color-mix(in srgb, var(--sys-color-primary) 20%, transparent);
}

.hero-art-circle--secondary {
  width: 5.5rem;
  height: 5.5rem;
  right: 1rem;
  bottom: -2rem;
  background: color-mix(in srgb, var(--sys-color-tertiary) 22%, transparent);
}

.hero-art-grid {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  width: 7rem;
  height: 4rem;
  transform: translateY(-50%);
  opacity: 0.25;
  background-image: radial-gradient(
    var(--sys-color-outline-variant) 1px,
    transparent 1px
  );
  background-size: 0.5rem 0.5rem;
}
</style>
