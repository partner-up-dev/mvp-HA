<template>
  <div class="tab-bar">
    <div class="tab-bar__list" role="tablist" :aria-label="ariaLabel">
      <button
        v-for="item in items"
        :key="item.key"
        :ref="(element) => setTabButtonRef(item.key, element)"
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
    <slot name="append" />
  </div>
</template>

<script setup lang="ts">
import { nextTick, watch, type ComponentPublicInstance } from "vue";

type TabBarKey = string | number;

type TabBarItem = {
  key: TabBarKey;
  label: string;
  disabled?: boolean;
};

const props = defineProps<{
  items: TabBarItem[];
  modelValue: TabBarKey;
  ariaLabel?: string;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: TabBarKey];
}>();

const tabButtons = new Map<TabBarKey, HTMLButtonElement>();

const setTabButtonRef = (
  key: TabBarKey,
  element: Element | ComponentPublicInstance | null,
) => {
  if (element instanceof HTMLButtonElement) {
    tabButtons.set(key, element);
    return;
  }

  tabButtons.delete(key);
};

const handleSelect = (item: TabBarItem) => {
  if (item.disabled === true) return;
  emit("update:modelValue", item.key);
};

const scrollActiveTabIntoView = async () => {
  await nextTick();
  const activeTab = tabButtons.get(props.modelValue);
  activeTab?.scrollIntoView({
    block: "nearest",
    inline: "center",
    behavior: "smooth",
  });
};

watch(
  () => props.modelValue,
  () => {
    void scrollActiveTabIntoView();
  },
  { immediate: true },
);

watch(
  () => props.items.map((item) => item.key),
  () => {
    void scrollActiveTabIntoView();
  },
);
</script>

<style lang="scss" scoped>
.tab-bar {
  display: flex;
  gap: var(--sys-spacing-sm);
  align-items: flex-start;
  padding-bottom: var(--sys-spacing-sm);
  min-width: 0;
}

.tab-bar__list {
  display: flex;
  gap: var(--sys-spacing-sm);
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
}

.tab-bar__list::-webkit-scrollbar {
  display: none;
}

.tab-bar__tab {
  @include mx.pu-font(label-medium);
  @include mx.pu-pill-action(outline-transparent, default);
  flex-shrink: 0;
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
