<template>
  <div class="dropdown-selector">
    <button
      type="button"
      class="dropdown-selector__trigger"
      :aria-expanded="isOpen"
      @click="isOpen = !isOpen"
    >
      {{ triggerText }}
    </button>

    <div v-if="isOpen" class="dropdown-selector__panel">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        class="dropdown-selector__option"
        @click="handleSelect(option.value)"
      >
        {{ option.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

type DropdownValue = string | number;
type DropdownOption = {
  value: DropdownValue;
  label: string;
};

const props = defineProps<{
  triggerLabel: string;
  value: DropdownValue | null;
  options: DropdownOption[];
}>();

const emit = defineEmits<{
  select: [value: DropdownValue];
}>();

const isOpen = ref(false);

const selectedOption = computed(() =>
  props.options.find((option) => option.value === props.value) ?? null,
);

const triggerText = computed(
  () => selectedOption.value?.label ?? props.triggerLabel,
);

const handleSelect = (value: DropdownValue) => {
  emit("select", value);
  isOpen.value = false;
};
</script>

<style lang="scss" scoped>
.dropdown-selector {
  position: relative;
}

.dropdown-selector__trigger {
  @include mx.pu-font(label-medium);
  @include mx.pu-pill-action(outline-transparent, default);
  cursor: pointer;
}

.dropdown-selector__panel {
  position: absolute;
  left: 0;
  top: calc(100% + var(--sys-spacing-xs));
  min-width: 180px;
  background: var(--sys-color-surface-container-high);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-md);
  padding: var(--sys-spacing-xs);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  z-index: 10;
}

.dropdown-selector__option {
  @include mx.pu-font(label-medium);
  border: none;
  background: transparent;
  text-align: left;
  color: var(--sys-color-on-surface);
  border-radius: var(--sys-radius-sm);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  cursor: pointer;

  &:hover {
    background: var(--sys-color-surface-container-highest);
  }
}
</style>
