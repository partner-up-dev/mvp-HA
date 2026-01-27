<template>
  <Modal
    :open="open"
    max-width="360px"
    title="修改需求状态"
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
      <label>输入PIN码确认</label>
      <input
        v-model="modifyPin"
        type="password"
        inputmode="numeric"
        maxlength="4"
        placeholder="****"
      />
    </div>

    <div class="modal-actions">
      <button class="cancel-btn" @click="handleClose">取消</button>
      <SubmitButton
        :loading="updateMutation.isPending.value"
        :disabled="!modifyPin || modifyPin.length !== 4"
        @click="handleConfirm"
      >
        确认修改
      </SubmitButton>
    </div>

    <ErrorToast
      v-if="updateMutation.isError.value"
      :message="updateMutation.error.value?.message || '修改失败'"
      @close="updateMutation.reset()"
    />
  </Modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Modal from "@/components/Modal.vue";
import SubmitButton from "@/components/SubmitButton.vue";
import ErrorToast from "@/components/ErrorToast.vue";
import { useUpdatePRStatus } from "@/queries/useUpdatePRStatus";
import type { PRId } from "@partner-up-dev/backend";

interface StatusOption {
  value: "OPEN" | "ACTIVE" | "CLOSED";
  label: string;
}

const props = defineProps<{
  open: boolean;
  prId: PRId;
}>();

const emit = defineEmits<{
  close: [];
}>();

const statusOptions: StatusOption[] = [
  { value: "OPEN", label: "可加入" },
  { value: "ACTIVE", label: "进行中" },
  { value: "CLOSED", label: "已结束" },
];

const updateMutation = useUpdatePRStatus();
const selectedStatus = ref<"OPEN" | "ACTIVE" | "CLOSED">("OPEN");
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

  input {
    @include mx.pu-font(title-medium);
    width: 100%;
    padding: var(--sys-spacing-sm);
    border: 1px solid var(--sys-color-outline);
    border-radius: var(--sys-radius-sm);
    background: transparent;
    text-align: center;
    letter-spacing: 0.5em;

    &:focus {
      outline: none;
      border-color: var(--sys-color-primary);
    }
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
