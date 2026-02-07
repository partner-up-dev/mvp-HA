<template>
  <div class="home-page">
    <header class="header">
      <h1>{{ t("home.title") }}</h1>
      <p>{{ t("home.subtitle") }}</p>
    </header>

    <main class="main">
      <section class="entry-panel">
        <HomeStructuredEntry />
        <HomeNaturalLanguageEntry />
      </section>

      <CreatedPRList empty-mode="hide" />
    </main>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import CreatedPRList from "@/components/CreatedPRList.vue";
import HomeNaturalLanguageEntry from "@/components/HomeNaturalLanguageEntry.vue";
import HomeStructuredEntry from "@/components/HomeStructuredEntry.vue";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.home-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
}

.header {
  padding: var(--sys-spacing-lg) 0;

  h1 {
    @include mx.pu-font(headline-large);
    color: var(--sys-color-primary);
    margin: 0;
  }
  p {
    @include mx.pu-font(body-large);
    color: var(--sys-color-on-surface-variant);
  }
}

.main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.entry-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-lg);
}
</style>
