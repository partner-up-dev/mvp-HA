<template>
  <section class="value-props" aria-labelledby="home-value-props-title">
    <h2 id="home-value-props-title">{{ t("home.landing.valuePropsTitle") }}</h2>
    <ol class="value-list">
      <li v-for="item in valueItems" :key="item.key" class="value-item">
        <span class="value-order" aria-hidden="true">{{ item.order }}</span>
        <span class="value-text-wrap">
          <span class="value-icon" :class="item.icon" aria-hidden="true"></span>
          <span class="value-text">{{ t(item.key) }}</span>
        </span>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const valueItems = computed(() => [
  {
    order: "01",
    key: "home.landing.valueProps.item1",
    icon: "i-mdi-message-text-fast-outline",
  },
  {
    order: "02",
    key: "home.landing.valueProps.item2",
    icon: "i-mdi-account-group-outline",
  },
  {
    order: "03",
    key: "home.landing.valueProps.item3",
    icon: "i-mdi-share-variant-outline",
  },
]);
</script>

<style lang="scss" scoped>
.value-props {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  padding-top: var(--sys-spacing-md);
  border-top: 1px solid var(--sys-color-outline-variant);
}

h2 {
  @include mx.pu-font(title-small);
  color: var(--sys-color-on-surface-variant);
  letter-spacing: 0.07em;
  text-transform: uppercase;
}

.value-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  padding: 0;
  margin: 0;
  counter-reset: value-step;
}

.value-item {
  padding: var(--sys-spacing-sm) 0;
  display: flex;
  align-items: baseline;
  gap: var(--sys-spacing-sm);
  border-bottom: 1px dashed color-mix(in srgb, var(--sys-color-outline) 45%, transparent);
}

.value-order {
  @include mx.pu-font(title-medium);
  color: color-mix(in srgb, var(--sys-color-outline) 70%, transparent);
  min-width: 2.5ch;
}

.value-text-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xs);
}

.value-icon {
  @include mx.pu-icon(small, true);
  color: var(--sys-color-primary);
  flex-shrink: 0;
}

.value-text {
  @include mx.pu-font(title-medium);
  color: var(--sys-color-on-surface);
}
</style>
