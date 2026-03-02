<template>
  <section class="value-props" aria-labelledby="home-value-props-title">
    <h2 id="home-value-props-title">{{ t("home.landing.valuePropsTitle") }}</h2>
    <ul class="value-list">
      <li v-for="item in valueItems" :key="item.key" class="value-item">
        <span class="value-icon" :class="item.icon" aria-hidden="true"></span>
        <span class="value-text">{{ t(item.key) }}</span>
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

const { t } = useI18n();

const valueItems = computed(() => [
  {
    key: "home.landing.valueProps.item1",
    icon: "i-mdi-message-text-fast-outline",
  },
  {
    key: "home.landing.valueProps.item2",
    icon: "i-mdi-account-group-outline",
  },
  {
    key: "home.landing.valueProps.item3",
    icon: "i-mdi-share-variant-outline",
  },
]);
</script>

<style lang="scss" scoped>
.value-props {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

h2 {
  @include mx.pu-font(title-medium);
  color: var(--sys-color-on-surface);
}

.value-list {
  list-style: none;
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sys-spacing-xs);
  padding: 0;
  margin: 0;
}

.value-item {
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container-low);
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
}

.value-icon {
  @include mx.pu-icon(medium, true);
  color: var(--sys-color-primary);
  flex-shrink: 0;
}

.value-text {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
}
</style>
