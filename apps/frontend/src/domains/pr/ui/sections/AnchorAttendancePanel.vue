<template>
  <section v-if="(hasJoined && canConfirm) || (hasJoined && canCheckIn)" class="actions">
    <Button
      v-if="hasJoined && canConfirm"
      class="confirm-slot-btn"
      tone="secondary"
      @click="emit('confirm-slot')"
      :disabled="confirmPending"
    >
      {{ confirmPending ? t("prPage.confirmingSlot") : t("prPage.confirmSlot") }}
    </Button>

    <Button
      v-if="hasJoined && canCheckIn"
      class="checkin-attended-btn"
      tone="tertiary"
      @click="emit('prepare-check-in')"
      :disabled="checkInPending"
    >
      {{ checkInPending ? t("prPage.checkingIn") : t("prPage.checkInAttended") }}
    </Button>
  </section>

  <section v-if="showCheckInFollowup" class="checkin-followup">
    <p class="checkin-followup-text">
      {{ t("prPage.checkInFollowupQuestion", { status: checkInFollowupStatusLabel }) }}
    </p>
    <div class="checkin-followup-actions">
      <Button
        class="checkin-followup-btn confirm"
        tone="primary"
        :disabled="checkInPending"
        @click="emit('submit-check-in', true)"
      >
        {{ t("prPage.wouldJoinAgainYes") }}
      </Button>
      <Button
        class="checkin-followup-btn decline"
        tone="outline"
        :disabled="checkInPending"
        @click="emit('submit-check-in', false)"
      >
        {{ t("prPage.wouldJoinAgainNo") }}
      </Button>
      <Button
        class="checkin-followup-btn cancel"
        tone="outline"
        :disabled="checkInPending"
        @click="emit('cancel-check-in')"
      >
        {{ t("common.cancel") }}
      </Button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import Button from "@/shared/ui/actions/Button.vue";

defineProps<{
  hasJoined: boolean;
  canConfirm: boolean;
  canCheckIn: boolean;
  showCheckInFollowup: boolean;
  checkInFollowupStatusLabel: string;
  confirmPending: boolean;
  checkInPending: boolean;
}>();

const emit = defineEmits<{
  "confirm-slot": [];
  "prepare-check-in": [];
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
  gap: var(--sys-spacing-small);
  margin-top: var(--sys-spacing-small);
}

.actions > button {
  width: 100%;
}

.confirm-slot-btn,
.checkin-attended-btn {
  flex: 1;
  min-width: 0;
  font-weight: 600;
}

.checkin-followup {
  margin-top: var(--sys-spacing-small);
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-small);
  background: var(--sys-color-surface-container-low);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.checkin-followup-text {
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface);
}

.checkin-followup-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--sys-spacing-small);
}

.checkin-followup-btn.cancel {
  grid-column: 1 / -1;
}
</style>
