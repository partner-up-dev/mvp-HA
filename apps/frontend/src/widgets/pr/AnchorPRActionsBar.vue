<template>
  <section class="slot-state">
    <p class="slot-state-text">{{ slotStateText }}</p>
  </section>

  <section class="actions">
    <button
      v-if="canJoin"
      class="join-btn"
      :disabled="joinPending"
      @click="emit('join')"
    >
      {{ joinPending ? t("prPage.joining") : t("prPage.join") }}
    </button>

    <button
      v-if="hasJoined && !isCreator"
      class="exit-btn"
      :disabled="exitPending"
      @click="emit('exit')"
    >
      {{ exitPending ? t("prPage.exiting") : t("prPage.exit") }}
    </button>

    <button
      v-if="hasJoined && canConfirm"
      class="confirm-btn"
      :disabled="confirmPending"
      @click="emit('confirm-slot')"
    >
      {{ confirmPending ? t("prPage.confirmingSlot") : t("prPage.confirmSlot") }}
    </button>

    <button
      v-if="hasJoined && hasStarted"
      class="attended-btn"
      :disabled="checkInPending"
      @click="emit('prepare-check-in', true)"
    >
      {{ checkInPending ? t("prPage.checkingIn") : t("prPage.checkInAttended") }}
    </button>

    <button
      v-if="hasJoined && hasStarted"
      class="missed-btn"
      :disabled="checkInPending"
      @click="emit('prepare-check-in', false)"
    >
      {{ checkInPending ? t("prPage.checkingIn") : t("prPage.checkInMissed") }}
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
.confirm-btn,
.attended-btn,
.missed-btn,
.secondary-btn {
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
}

.exit-btn {
  border: 1px solid var(--sys-color-error);
  background: transparent;
  color: var(--sys-color-error);
}

.confirm-btn {
  border: 1px solid var(--sys-color-primary);
  background: transparent;
  color: var(--sys-color-primary);
}

.attended-btn {
  border: none;
  background: var(--sys-color-tertiary);
  color: var(--sys-color-on-tertiary);
}

.missed-btn {
  border: 1px solid var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.secondary-btn {
  border: 1px solid var(--sys-color-outline);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
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
}

.checkin-followup-btn.confirm {
  border: none;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}

.checkin-followup-btn.cancel {
  grid-column: 1 / -1;
}

@include mx.breakpoint(md) {
  .actions > button {
    width: auto;
  }
}
</style>
