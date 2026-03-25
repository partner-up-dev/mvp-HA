<template>
  <Transition name="bottom-drawer">
    <div
      v-show="open"
      class="bottom-drawer-overlay"
      :style="{ zIndex: String(zIndex) }"
      @click.self="handleBackdropClick"
    >
      <section
        class="bottom-drawer"
        :aria-label="resolvedAriaLabel"
        aria-modal="true"
        role="dialog"
        :style="{ maxWidth: props.maxWidth }"
      >
        <header
          v-if="$slots.header || title || showClose"
          class="bottom-drawer-header"
        >
          <slot name="header">
            <h3 v-if="title" class="bottom-drawer-title">{{ title }}</h3>
          </slot>
          <button
            v-if="showClose"
            class="bottom-drawer-close"
            type="button"
            aria-label="Close drawer"
            @click="emitClose"
          >
            <span class="i-mdi-close" aria-hidden="true"></span>
          </button>
        </header>

        <div class="bottom-drawer-content">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="bottom-drawer-footer">
          <slot name="footer" />
        </footer>
      </section>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, watch } from "vue";

interface Props {
  open: boolean;
  title?: string;
  ariaLabel?: string;
  showClose?: boolean;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  maxWidth?: string;
  zIndex?: number;
}

const props = withDefaults(defineProps<Props>(), {
  title: undefined,
  ariaLabel: undefined,
  showClose: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  maxWidth: "720px",
  zIndex: 1000,
});

const emit = defineEmits<{
  close: [];
}>();

const resolvedAriaLabel = computed(
  () => props.ariaLabel ?? props.title ?? "Bottom drawer",
);

const emitClose = (): void => {
  emit("close");
};

const handleBackdropClick = (): void => {
  if (!props.closeOnBackdrop) return;
  emitClose();
};

const handleEscape = (event: KeyboardEvent): void => {
  if (!props.closeOnEscape) return;
  if (event.key !== "Escape" || !props.open) return;
  emitClose();
};

watch(
  () => props.open,
  (isOpen) => {
    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return;
    }
    document.removeEventListener("keydown", handleEscape);
  },
);

onMounted(() => {
  if (props.open) {
    document.addEventListener("keydown", handleEscape);
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleEscape);
});
</script>

<style lang="scss" scoped>
.bottom-drawer-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding:
    calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  background: rgba(0, 0, 0, 0.48);
}

.bottom-drawer {
  width: 100%;
  max-height: calc(
    var(--pu-vh) - var(--pu-safe-top) - (2 * var(--sys-spacing-med))
  );
  border-radius: var(--sys-radius-lg) var(--sys-radius-lg) var(--sys-radius-med)
    var(--sys-radius-med);
  background: var(--sys-color-surface);
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.bottom-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-sm);
}

.bottom-drawer-title {
  @include mx.pu-font(title-medium);
  margin: 0;
}

.bottom-drawer-close {
  @include mx.pu-pill-action(transparent, small);
  border: none;
  cursor: pointer;
  color: var(--sys-color-on-surface);
}

.bottom-drawer-content {
  flex: 1 1 auto;
  min-height: 0;
  padding:
    var(--sys-spacing-xs) var(--sys-spacing-xs)
    calc(var(--sys-spacing-xs) + var(--pu-safe-bottom));
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;
}

.bottom-drawer-footer {
  padding:
    0 var(--sys-spacing-sm)
    calc(var(--sys-spacing-sm) + var(--pu-safe-bottom));
}

.bottom-drawer-enter-active,
.bottom-drawer-leave-active {
  transition: background-color 220ms ease;
}

.bottom-drawer-enter-active .bottom-drawer,
.bottom-drawer-leave-active .bottom-drawer {
  transition: transform 220ms ease;
}

.bottom-drawer-enter-from,
.bottom-drawer-leave-to {
  background: rgba(0, 0, 0, 0);
}

.bottom-drawer-enter-from .bottom-drawer,
.bottom-drawer-leave-to .bottom-drawer {
  transform: translateY(calc(100% + var(--sys-spacing-lg)));
}

@media (prefers-reduced-motion: reduce) {
  .bottom-drawer-enter-active,
  .bottom-drawer-leave-active,
  .bottom-drawer-enter-active .bottom-drawer,
  .bottom-drawer-leave-active .bottom-drawer {
    transition: none;
  }
}
</style>
