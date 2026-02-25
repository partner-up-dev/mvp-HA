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
      v-if="hasJoined && canConfirm"
      class="confirm-slot-btn"
      @click="emit('confirm-slot')"
      :disabled="confirmPending"
    >
      {{ confirmPending ? t("prPage.confirmingSlot") : t("prPage.confirmSlot") }}
    </button>

    <button
      v-if="hasJoined && hasStarted"
      class="checkin-attended-btn"
      @click="emit('prepare-check-in', true)"
      :disabled="checkInPending"
    >
      {{ checkInPending ? t("prPage.checkingIn") : t("prPage.checkInAttended") }}
    </button>

    <button
      v-if="hasJoined && hasStarted"
      class="checkin-missed-btn"
      @click="emit('prepare-check-in', false)"
      :disabled="checkInPending"
    >
      {{ checkInPending ? t("prPage.checkingIn") : t("prPage.checkInMissed") }}
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

  <section v-if="showCheckInFollowup" class="checkin-followup">
    <p class="checkin-followup-text">
      {{ t("prPage.checkInFollowupQuestion", { status: checkInFollowupStatusLabel }) }}
    </p>
    <div class="checkin-followup-actions">
      <button
        class="checkin-followup-btn confirm"
        :disabled="checkInPending"
        @click="emit('submit-check-in', true)"
      >
        {{ t("prPage.wouldJoinAgainYes") }}
      </button>
      <button
        class="checkin-followup-btn decline"
        :disabled="checkInPending"
        @click="emit('submit-check-in', false)"
      >
        {{ t("prPage.wouldJoinAgainNo") }}
      </button>
      <button
        class="checkin-followup-btn cancel"
        :disabled="checkInPending"
        @click="emit('cancel-check-in')"
      >
        {{ t("common.cancel") }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{
  canJoin: boolean;
  hasJoined: boolean;
  isCreator: boolean;
  canConfirm: boolean;
  hasStarted: boolean;
  showEditContentAction: boolean;
  showModifyStatusAction: boolean;
  showCheckInFollowup: boolean;
  checkInFollowupStatusLabel: string;
  slotStateText: string;
  joinPending: boolean;
  exitPending: boolean;
  confirmPending: boolean;
  checkInPending: boolean;
}>();

const emit = defineEmits<{
  join: [];
  exit: [];
  "confirm-slot": [];
  "prepare-check-in": [didAttend: boolean];
  "submit-check-in": [wouldJoinAgain: boolean];
  "cancel-check-in": [];
  "edit-content": [];
  "modify-status": [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.actions {
  display: flex;
  flex-direction: row;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.slot-state {
  margin-top: var(--sys-spacing-med);
}

.slot-state-text {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.checkin-followup {
  margin-top: var(--sys-spacing-sm);
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container-low);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.checkin-followup-text {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
}

.checkin-followup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sys-spacing-sm);
}

.checkin-followup-btn {
  @include mx.pu-font(label-large);
  min-height: var(--sys-size-large);
  border-radius: var(--sys-radius-sm);
  cursor: pointer;
  border: 1px solid var(--sys-color-outline);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.checkin-followup-btn.confirm {
  border: none;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.checkin-followup-btn.cancel {
  grid-column: 1 / -1;
}

.actions > button {
  width: 100%;
}

@include mx.breakpoint(md) {
  .actions {
    flex-direction: row;
    flex-wrap: wrap;
  }
}

.join-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: none;
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  cursor: pointer;
  font-weight: 600;

  &:hover:not(:disabled) {
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.exit-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-error);
  border-radius: var(--sys-radius-sm);
  background: transparent;
  color: var(--sys-color-error);
  cursor: pointer;
  font-weight: 600;

  &:hover:not(:disabled) {
    background: var(--sys-color-error-container);
    color: var(--sys-color-on-error-container);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
}

.confirm-slot-btn,
.checkin-attended-btn,
.checkin-missed-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border-radius: var(--sys-radius-sm);
  cursor: pointer;
  font-weight: 600;
}

.confirm-slot-btn {
  border: 1px solid var(--sys-color-primary);
  background: transparent;
  color: var(--sys-color-primary);
}

.checkin-attended-btn {
  border: none;
  background: var(--sys-color-tertiary);
  color: var(--sys-color-on-tertiary);
}

.checkin-missed-btn {
  border: 1px solid var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.edit-content-btn,
.modify-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
  cursor: pointer;

  &:hover {
    background: var(--sys-color-surface-container-highest);
  }
}
</style>

