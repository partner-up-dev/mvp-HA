<template>
  <header class="page-header">
    <div class="page-header__top">
      <button
        v-if="showBack"
        class="page-header__back-btn"
        :aria-label="backLabel"
        @click="handleBack"
      >
        <div class="i-mdi-arrow-left font-title-large"></div>
      </button>

      <h1 class="page-header__title">{{ title }}</h1>

      <slot name="top-actions" />
    </div>

    <p v-if="subtitle" class="page-header__subtitle">{{ subtitle }}</p>

    <div v-if="$slots.meta" class="page-header__meta">
      <slot name="meta" />
    </div>
  </header>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import { getCurrentInstance } from "vue";
import { useRouter } from "vue-router";

const props = withDefaults(
  defineProps<{
    title: string;
    subtitle?: string;
    showBack?: boolean;
    backLabel?: string;
  }>(),
  {
    showBack: true,
  },
);

const emit = defineEmits<{
  (e: "back"): void;
}>();

const { t } = useI18n();
const router = useRouter();

const backLabel = props.backLabel ?? t("common.backToHome");

function handleBack() {
  const inst = getCurrentInstance();
  const hasListener =
    !!inst?.vnode.props &&
    ((inst.vnode.props as Record<string, unknown>)["onBack"] ||
      (inst.vnode.props as Record<string, unknown>)["onBack"] === null);

  if (hasListener) {
    emit("back");
    return;
  }

  router.back();
}
</script>

<style lang="scss" scoped>
.page-header {
  margin-bottom: var(--sys-spacing-lg);
}

.page-header__top {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  min-width: 0;
  margin-bottom: var(--sys-spacing-sm);
}

.page-header__back-btn {
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

.page-header__title {
  @include mx.pu-font(headline-large);
  color: var(--sys-color-on-surface);
  margin: 0;
  flex: 1;
  min-width: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.page-header__subtitle {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
  margin: 0;
}

.page-header__meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: var(--sys-spacing-sm);
  gap: var(--sys-spacing-sm);
}
</style>
