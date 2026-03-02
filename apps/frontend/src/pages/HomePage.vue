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
  max-width: 560px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.secondary-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  margin-bottom: calc(var(--sys-spacing-lg) + var(--pu-safe-bottom));
}

.secondary-entry {
  text-decoration: none;
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container-low);
  padding: var(--sys-spacing-med);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: var(--sys-spacing-sm);
}

.secondary-copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2 {
    @include mx.pu-font(title-medium);
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
  color: var(--sys-color-primary);
  flex-shrink: 0;
}
</style>
