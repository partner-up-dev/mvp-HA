<template>
  <div class="home-page">
    <HomeHero />
    <HomeValueProps />
    <HomeEventHighlights />
    <HomeEventPlazaEntry />

    <section class="secondary-actions">
      <RouterLink class="secondary-entry" :to="{ name: 'pr-new' }">
        <div class="secondary-copy">
          <h2>{{ t("home.landing.secondaryCreateTitle") }}</h2>
          <p>{{ t("home.landing.secondaryCreateDescription") }}</p>
        </div>
        <span class="secondary-action-text">
          {{ t("home.landing.secondaryCreateAction") }}
        </span>
      </RouterLink>
      <HomeContactEntry />
    </section>

    <HomeBookmarkNudge />
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import HomeHero from "@/widgets/home/HomeHero.vue";
import HomeValueProps from "@/widgets/home/HomeValueProps.vue";
import HomeEventHighlights from "@/widgets/home/HomeEventHighlights.vue";
import HomeEventPlazaEntry from "@/widgets/home/HomeEventPlazaEntry.vue";
import HomeBookmarkNudge from "@/widgets/home/HomeBookmarkNudge.vue";
import HomeContactEntry from "@/widgets/home/HomeContactEntry.vue";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.home-page {
  position: relative;
  isolation: isolate;
  overflow-x: clip;
  max-width: 680px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-lg) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-lg) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
  display: flex;
  flex-direction: column;
  gap: clamp(1.5rem, 6vw, 3rem);
}

.home-page::before,
.home-page::after {
  content: "";
  position: absolute;
  pointer-events: none;
  z-index: 0;
  border-radius: 999px;
}

.home-page::before {
  width: 15rem;
  height: 15rem;
  top: 4rem;
  right: -7rem;
  background: color-mix(in srgb, var(--sys-color-tertiary) 16%, transparent);
  filter: blur(4px);
}

.home-page::after {
  width: 12rem;
  height: 12rem;
  top: 18rem;
  left: -8rem;
  background: color-mix(in srgb, var(--sys-color-primary) 13%, transparent);
}

.home-page > * {
  position: relative;
  z-index: 1;
}

.secondary-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  padding-top: var(--sys-spacing-md);
  border-top: 1px solid var(--sys-color-outline-variant);
  margin-bottom: calc(var(--sys-spacing-lg) + var(--pu-safe-bottom));
}

.secondary-entry {
  text-decoration: none;
  padding: var(--sys-spacing-xs) 0;
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: end;
  gap: var(--sys-spacing-sm);
}

.secondary-copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2 {
    @include mx.pu-font(headline-small);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}

.secondary-action-text {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
  flex-shrink: 0;

  &::after {
    content: " \2192";
  }
}
</style>
