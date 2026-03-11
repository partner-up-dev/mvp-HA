<template>
  <div class="tab-bar" role="tablist" :aria-label="ariaLabel">
    <button
      v-for="item in items"
      :key="item.key"
      type="button"
      role="tab"
      class="tab-bar__tab"
      :class="{ 'tab-bar__tab--active': modelValue === item.key }"
      :aria-selected="modelValue === item.key"
      :disabled="item.disabled === true"
      @click="handleSelect(item)"
    >
      {{ item.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
type TabBarKey = string | number;

type TabBarItem = {
  key: TabBarKey;
  label: string;
  disabled?: boolean;
};

defineProps<{
  items: TabBarItem[];
  modelValue: TabBarKey;
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TabBarKey];
}>();

const handleSelect = (item: TabBarItem) => {
  if (item.disabled === true) return;
  emit("update:modelValue", item.key);
};
</script>

<style lang="scss" scoped>
.tab-bar {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 0.5rem;
  scrollbar-width: none;
}

.tab-bar::-webkit-scrollbar {
  display: none;
}

.tab-bar__tab {
  @include mx.pu-font(label-medium);
  flex-shrink: 0;
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1px solid var(--sys-color-outline-variant);
  background: transparent;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  transition:
    background-color 150ms ease,
    color 150ms ease,
    border-color 150ms ease;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.tab-bar__tab--active {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  border-color: var(--sys-color-primary);
}
</style>
