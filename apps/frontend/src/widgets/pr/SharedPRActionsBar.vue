<template>
  <section class="slot-state">
    <p class="slot-state-text">{{ slotStateText }}</p>
  </section>

  <section class="actions">
    <button v-if="canJoin" class="join-btn" @click="emit('join')" :disabled="joinPending">
      {{ joinPending ? t("prPage.joining") : t("prPage.join") }}
    </button>

    <button
      v-if="hasJoined && !isCreator"
      class="exit-btn"
      @click="emit('exit')"
      :disabled="exitPending"
    >
      {{ exitPending ? t("prPage.exiting") : t("prPage.exit") }}
    </button>

    <button
      v-if="showEditContentAction"
      class="edit-content-btn"
      @click="emit('edit-content')"
    >
      {{ t("prPage.editContent") }}
    </button>

    <button
      v-if="showModifyStatusAction"
      class="modify-btn"
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
  hasJoined: boolean;
  isCreator: boolean;
  showEditContentAction: boolean;
  showModifyStatusAction: boolean;
  slotStateText: string;
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
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.actions > button {
  width: 100%;
}

.join-btn,
.exit-btn,
.edit-content-btn,
.modify-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border-radius: var(--sys-radius-sm);
  cursor: pointer;
}

.join-btn {
  border: none;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  font-weight: 600;
}

.exit-btn {
  border: 1px solid var(--sys-color-error);
  background: transparent;
  color: var(--sys-color-error);
  font-weight: 600;
}

.edit-content-btn,
.modify-btn {
  border: 1px solid var(--sys-color-outline);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
}
</style>
