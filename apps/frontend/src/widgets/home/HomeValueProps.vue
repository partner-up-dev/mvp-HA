<template>
  <section class="value-props" aria-labelledby="home-value-props-title">
    <h2
      id="home-value-props-title"
      :class="{ 'is-visible': props.startReveal }"
    >
      {{ t("home.landing.valuePropsTitle") }}
    </h2>
    <ol class="value-list">
      <li
        v-for="(item, index) in valueItems"
        :key="item.key"
        class="value-item"
        :class="{ 'is-visible': props.startReveal }"
        :style="{ transitionDelay: `${index * 130}ms` }"
      >
        <RouterLink class="value-link" :to="{ name: 'pr-new' }">
          <span class="value-order" aria-hidden="true">{{ item.order }}</span>
          <span class="value-text-wrap">
            <span
              class="value-icon"
              :class="item.icon"
              aria-hidden="true"
            ></span>
            <span class="value-text">{{ t(item.key) }}</span>
          </span>
          <span v-if="index === 0" class="i-mdi-arrow-right ml-auto"></span>
        </RouterLink>
      </li>
    </ol>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";

const { t } = useI18n();
const props = withDefaults(
  defineProps<{
    startReveal?: boolean;
  }>(),
  {
    startReveal: false,
  },
);

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
}

h2 {
  @include mx.pu-font(title-small);
  color: var(--sys-color-on-surface-variant);
  letter-spacing: 0.07em;
  text-transform: uppercase;
  opacity: 0;
  transform: translate3d(0, 0.4rem, 0);
  transition:
    opacity 300ms ease,
    transform 300ms ease;
}

h2.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.value-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  padding: 0;
  margin: 0;
}

.value-item {
  padding: 0;
  border-bottom: 1px dashed
    color-mix(in srgb, var(--sys-color-outline) 45%, transparent);
  opacity: 0;
  transform: translate3d(0, 0.72rem, 0);
  transition:
    opacity 320ms ease,
    transform 320ms ease;
}

.value-item.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0);
}

.value-link {
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  transition: opacity 180ms ease;
  color: var(--sys-color-on-surface);

  &:hover {
    opacity: 0.84;
  }

  &:active {
    opacity: 0.68;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 3px;
  }
}

.value-order {
  @include mx.pu-font(title-medium);
  color: color-mix(in srgb, var(--sys-color-outline) 70%, transparent);
  min-width: 2.5ch;
}

.value-text-wrap {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
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

@media (max-width: 768px) {
  .value-props {
    gap: clamp(1rem, 4.2vw, 1.5rem);
  }

  h2 {
    @include mx.pu-font(title-medium);
    letter-spacing: 0.05em;
  }

  .value-list {
    gap: var(--sys-spacing-sm);
  }

  .value-link {
    padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  }

  .value-order {
    @include mx.pu-font(title-large);
  }

  .value-icon {
    @include mx.pu-icon(medium, true);
  }

  .value-text {
    @include mx.pu-font(body-large);
  }
}

@media (prefers-reduced-motion: reduce) {
  h2,
  .value-item,
  .value-link {
    animation: none !important;
    transition: none !important;
  }
}
</style>
