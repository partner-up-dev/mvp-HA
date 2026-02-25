<template>
  <header
    class="page-header"
    :class="{ 'page-header-home': !canGoBack }"
  >
    <button
      class="home-btn"
      type="button"
      @click="handleHeaderAction"
      :aria-label="headerActionAriaLabel"
    >
      <div
        v-if="canGoBack"
        class="i-mdi-arrow-left font-title-large"
      ></div>
      <div v-else class="i-mdi-home font-title-large"></div>
    </button>

    <div class="title-wrap">
      <slot />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useHeaderBackHomeAction } from "@/composables/useHeaderBackHomeAction";

const { canGoBack, headerActionAriaLabel, handleHeaderAction } =
  useHeaderBackHomeAction();
</script>

<style lang="scss" scoped>
.page-header {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-lg);
}

.home-btn {
  display: flex;
  background: transparent;
  border: none;
  color: var(--sys-color-on-surface);
  cursor: pointer;
  min-width: var(--sys-size-large);
  min-height: var(--sys-size-large);
  border-radius: 999px;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &:hover {
    background: var(--sys-color-surface-container);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.title-wrap {
  flex: 1;
  min-width: 0;
}

.page-header-home .title-wrap {
  text-align: right;
}
</style>
