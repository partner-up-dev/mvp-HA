<template>
  <section class="expandable-card">
    <button
      type="button"
      class="expandable-card__toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <div class="expandable-card__header">
        <h3 class="expandable-card__title">{{ title }}</h3>
        <p v-if="subtitle" class="expandable-card__subtitle">{{ subtitle }}</p>
      </div>
      <span class="expandable-card__icon" :class="{ 'is-open': expanded }">
        ▾
      </span>
    </button>
    <Transition name="expandable-card-content">
      <div v-if="expanded" class="expandable-card__content">
        <slot />
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string | null;
    defaultExpanded?: boolean;
  }>(),
  {
    subtitle: null,
    defaultExpanded: false,
  },
);

const expanded = ref(props.defaultExpanded);
</script>

<style lang="scss" scoped>
.expandable-card {
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-large);
  background: var(--sys-color-surface);
}

.expandable-card__toggle {
  width: 100%;
  min-height: var(--sys-size-large);
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  text-align: left;
}

.expandable-card__header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
}

.expandable-card__title {
  margin: 0;
  @include mx.pu-font(title-small);
}

.expandable-card__subtitle {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.expandable-card__icon {
  @include mx.pu-font(label-medium);
  transition: transform 0.18s ease;
}

.expandable-card__icon.is-open {
  transform: rotate(180deg);
}

.expandable-card__content {
  padding: 0 var(--sys-spacing-medium) var(--sys-spacing-medium);
}

.expandable-card-content-enter-active,
.expandable-card-content-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.expandable-card-content-enter-from,
.expandable-card-content-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
