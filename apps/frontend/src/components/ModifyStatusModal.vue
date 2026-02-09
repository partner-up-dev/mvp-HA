<template>
  <Modal
    :open="open"
    max-width="360px"
    :title="t('modifyStatusModal.title')"
    @close="handleClose"
  >
    <div class="status-options">
      <button
        v-for="status in statusOptions"
        :key="status.value"
        :class="['status-option', { active: selectedStatus === status.value }]"
        @click="selectedStatus = status.value"
      >
        {{ status.label }}
      </button>
    </div>

    <div class="pin-input">
      <label>{{ t("modifyStatusModal.pinLabel") }}</label>
      <PINInput
        v-model="modifyPin"
        :pr-id="prId"
        :auto-generate="false"
        :allow-regenerate="false"
        :show-label="false"
        :show-info="false"
      />
    </div>

    <div class="modal-actions">
      <button class="cancel-btn" @click="handleClose">
        {{ t("common.cancel") }}
      </button>
      <SubmitButton
        :loading="updateMutation.isPending.value"
        :disabled="!modifyPin || modifyPin.length !== 4"
        @click="handleConfirm"
      >
        {{ t("modifyStatusModal.confirmAction") }}
      </SubmitButton>
    </div>

    <ErrorToast
      v-if="updateMutation.isError.value"
      :message="
        updateMutation.error.value?.message ||
        t('modifyStatusModal.updateFailed')
      "
      @close="updateMutation.reset()"
    />
  </Modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import Modal from "@/components/Modal.vue";
import SubmitButton from "@/components/SubmitButton.vue";
import ErrorToast from "@/components/ErrorToast.vue";
import PINInput from "@/components/PINInput.vue";
import { useUpdatePRStatus } from "@/queries/useUpdatePRStatus";
import type { PRId, PRStatusManual } from "@partner-up-dev/backend";

interface StatusOption {
  value: PRStatusManual;
  label: string;
}

const props = defineProps<{
  open: boolean;
  prId: PRId;
}>();
const { t } = useI18n();

const emit = defineEmits<{
  close: [];
}>();

const statusOptions: StatusOption[] = [
  { value: "OPEN", label: t("status.open") },
  { value: "ACTIVE", label: t("status.active") },
  { value: "CLOSED", label: t("status.closed") },
];

const updateMutation = useUpdatePRStatus();
const selectedStatus = ref<PRStatusManual>("OPEN");
const modifyPin = ref("");

const handleClose = () => {
  selectedStatus.value = "OPEN";
  modifyPin.value = "";
  emit("close");
};

const handleConfirm = async () => {
  await updateMutation.mutateAsync({
    id: props.prId,
    status: selectedStatus.value,
    pin: modifyPin.value,
  });

  handleClose();
};
</script>

<style lang="scss" scoped>
.status-options {
  display: flex;
  gap: var(--sys-spacing-sm);
  margin-bottom: var(--sys-spacing-med);
}

.status-option {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm);
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container);
  cursor: pointer;

  &.active {
    background: var(--sys-color-primary-container);
    border-color: var(--sys-color-primary);
    color: var(--sys-color-on-primary-container);
  }
}

.pin-input {
  margin-bottom: var(--sys-spacing-med);

  label {
    @include mx.pu-font(label-medium);
    display: block;
    margin-bottom: var(--sys-spacing-xs);
    color: var(--sys-color-on-surface-variant);
  }
}

.modal-actions {
  display: flex;
  gap: var(--sys-spacing-sm);
}

.cancel-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  padding: var(--sys-spacing-sm);
  min-width: 66px;
  min-height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: transparent;
  cursor: pointer;
}
</style>
