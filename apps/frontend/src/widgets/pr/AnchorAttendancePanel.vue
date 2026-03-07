<template>
  <section class="actions">
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
  hasJoined: boolean;
  canConfirm: boolean;
  hasStarted: boolean;
  showCheckInFollowup: boolean;
  checkInFollowupStatusLabel: string;
  confirmPending: boolean;
  checkInPending: boolean;
}>();

const emit = defineEmits<{
  "confirm-slot": [];
  "prepare-check-in": [didAttend: boolean];
  "submit-check-in": [wouldJoinAgain: boolean];
  "cancel-check-in": [];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.actions {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-sm);
}

.actions > button {
  width: 100%;
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
</style>
