<template>
  <Transition name="bookmark-page-nudge-fade">
    <aside
      v-if="open"
      class="bookmark-page-nudge"
      role="status"
      aria-live="polite"
      data-testid="bookmark-page-nudge"
    >
      <div class="nudge-content">
        <span class="nudge-icon i-mdi-bookmark-outline" aria-hidden="true"></span>
        <div class="nudge-copy">
          <p class="nudge-title">
            {{ t("bookmarkPageNudge.title") }}
          </p>
          <p class="nudge-description">
            {{ t("bookmarkPageNudge.description") }}
          </p>
        </div>
      </div>

      <div class="nudge-actions">
        <Button
          appearance="pill"
          size="sm"
          type="button"
          data-testid="bookmark-page-nudge.acknowledge"
          @click="emit('acknowledge')"
        >
          {{ t("bookmarkPageNudge.acknowledgeAction") }}
        </Button>
      </div>
    </aside>
  </Transition>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  acknowledge: [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.bookmark-page-nudge {
  position: fixed;
  left: 50%;
  bottom: calc(var(--sys-spacing-medium) + var(--pu-safe-bottom));
  z-index: 60;
  display: grid;
  gap: var(--sys-spacing-small);
  width: min(100% - (var(--sys-spacing-medium) * 2), 28rem);
  padding: var(--sys-spacing-medium);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-on-surface);
  color: var(--sys-color-surface-container-lowest);
  transform: translateX(-50%);
  @include mx.pu-elevation(4);
}

.nudge-content {
  display: flex;
  gap: var(--sys-spacing-small);
  align-items: flex-start;
}

.nudge-icon {
  flex: 0 0 auto;
  color: var(--sys-color-primary);
  @include mx.pu-icon(large, true);
}

.nudge-copy {
  min-width: 0;
}

.nudge-title,
.nudge-description {
  margin: 0;
}

.nudge-title {
  @include mx.pu-font(body-large);
  color: var(--sys-color-surface-container-lowest);
}

.nudge-description {
  @include mx.pu-font(body-small);
  margin-top: var(--sys-spacing-xsmall);
  color: var(--sys-color-surface-container-highest);
}

.nudge-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xsmall);
  justify-content: flex-end;
}

.bookmark-page-nudge-fade-enter-active,
.bookmark-page-nudge-fade-leave-active {
  transition:
    opacity 220ms ease,
    transform 220ms ease;
}

.bookmark-page-nudge-fade-enter-from,
.bookmark-page-nudge-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 0.5rem);
}

@media (max-width: 480px) {
  .nudge-actions {
    justify-content: stretch;
  }

  .nudge-actions > :deep(.ui-button) {
    flex: 1 1 8rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .bookmark-page-nudge-fade-enter-active,
  .bookmark-page-nudge-fade-leave-active {
    transition: none !important;
  }
}
</style>
