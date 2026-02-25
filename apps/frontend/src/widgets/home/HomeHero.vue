<template>
  <header class="header">
    <h1>{{ t("home.title") }}</h1>
    <p>{{ t("home.subtitle") }}</p>
  </header>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

const { t } = useI18n();
</script>

<style lang="scss" scoped>
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
</style>

