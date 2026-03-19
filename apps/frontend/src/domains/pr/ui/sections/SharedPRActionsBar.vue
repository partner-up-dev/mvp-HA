<template>
  <section v-if="slotStateText" class="slot-state">
    <p class="slot-state-text">{{ slotStateText }}</p>
  </section>

  <section
    v-if="canJoin || canExit || showEditContentAction || showModifyStatusAction"
    class="actions"
  >
    <button
      v-if="canJoin"
      class="join-btn"
      :disabled="joinPending"
      @click="emit('join')"
    >
      {{ joinPending ? t("prPage.joining") : t("prPage.join") }}
    </button>

    <button
      v-if="canExit"
      class="exit-btn"
      :disabled="exitPending"
      @click="emit('exit')"
    >
      {{ exitPending ? t("prPage.exiting") : t("prPage.exit") }}
    </button>

    <button
      v-if="showEditContentAction"
      class="secondary-btn"
      @click="emit('edit-content')"
    >
      {{ t("prPage.editContent") }}
    </button>

    <button
      v-if="showModifyStatusAction"
      class="secondary-btn"
      @click="emit('modify-status')"
    >
      {{ t("prPage.modifyStatus") }}
    </button>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  canJoin: boolean;
  canExit: boolean;
  hasJoined: boolean;
  isCreator: boolean;
  showEditContentAction: boolean;
  showModifyStatusAction: boolean;
  slotStateText?: string;
  joinPending: boolean;
  exitPending: boolean;
}>();

const emit = defineEmits<{
  join: [];
  exit: [];
  "edit-content": [];
  "modify-status": [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.slot-state {
  margin-top: var(--sys-spacing-med);
}

.slot-state-text {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.actions > button {
  width: 100%;
}

.join-btn,
.exit-btn,
.secondary-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.join-btn {
  @include mx.pu-rect-action(primary, default);
}

.exit-btn {
  @include mx.pu-rect-action(danger, default);
}

.secondary-btn {
  @include mx.pu-rect-action(surface, default);
}

@include mx.breakpoint(md) {
  .actions > button {
    width: auto;
  }
}
</style>
