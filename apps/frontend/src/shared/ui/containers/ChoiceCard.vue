<template>
  <component
    :is="rootComponent"
    class="choice-card"
    :class="[
      `choice-card--tone-${props.tone}`,
      {
        'is-active': props.active,
        'is-disabled': props.disabled,
      },
    ]"
    v-bind="rootAttrs"
    @click="handleClick"
  >
    <slot />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink, type RouteLocationRaw } from "vue-router";

type ChoiceCardTone = "default" | "low";

const props = withDefaults(
  defineProps<{
    to?: RouteLocationRaw | null;
    type?: "button" | "submit" | "reset";
    tone?: ChoiceCardTone;
    active?: boolean;
    disabled?: boolean;
  }>(),
  {
    to: null,
    type: "button",
    tone: "default",
    active: false,
    disabled: false,
  },
);

const emit = defineEmits<{
  click: [event: MouseEvent];
}>();

const isLink = computed(() => props.to !== null);
const rootComponent = computed(() => (isLink.value ? RouterLink : "button"));
const rootAttrs = computed(() => {
  if (isLink.value) {
    return {
      to: props.to,
      "aria-disabled": props.disabled ? "true" : undefined,
      tabindex: props.disabled ? -1 : undefined,
    };
  }

  return {
    type: props.type,
    disabled: props.disabled,
  };
});

const handleClick = (event: MouseEvent) => {
  if (props.disabled) {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  emit("click", event);
};
</script>

<style lang="scss" scoped>
.choice-card {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: var(--sys-spacing-xsmall);
  width: 100%;
  min-width: 0;
  padding: var(--sys-spacing-small) var(--sys-spacing-medium);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-medium);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  font: inherit;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    border-color 180ms ease,
    color 180ms ease;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.choice-card--tone-low {
  background: var(--sys-color-surface-container-low);
}

.choice-card.is-active,
.choice-card.router-link-active {
  border-color: var(--sys-color-primary);
}

.choice-card.is-disabled {
  opacity: var(--sys-opacity-disabled);
  cursor: not-allowed;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .choice-card {
    transition: none !important;
  }
}
</style>
