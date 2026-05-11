<template>
  <Modal
    :open="open"
    max-width="360px"
    :title="t('modifyStatusModal.title')"
    @close="handleClose"
  >
    <div class="status-options">
      <ChoiceCard
        v-for="status in statusOptions"
        :key="status.value"
        class="status-option"
        :active="selectedStatus === status.value"
        @click="selectedStatus = status.value"
      >
        {{ status.label }}
      </ChoiceCard>
    </div>

    <div class="modal-actions">
      <Button tone="outline" @click="handleClose">
        {{ t("common.cancel") }}
      </Button>
      <Button
        :loading="isUpdatePending"
        @click="handleConfirm"
      >
        {{ t("modifyStatusModal.confirmAction") }}
      </Button>
    </div>

    <ErrorToast
      v-if="hasUpdateError"
      :message="updateError?.message || t('modifyStatusModal.updateFailed')"
      @close="resetUpdateMutation"
    />
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import Modal from "@/shared/ui/overlay/Modal.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import Button from "@/shared/ui/actions/Button.vue";
import ChoiceCard from "@/shared/ui/containers/ChoiceCard.vue";
import { useUpdatePRStatus } from "@/domains/pr/queries/usePRActions";
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
  { value: "READY", label: t("status.ready") },
  { value: "ACTIVE", label: t("status.active") },
  { value: "CLOSED", label: t("status.closed") },
];

const updateMutation = useUpdatePRStatus();
const selectedStatus = ref<PRStatusManual>("OPEN");
const isUpdatePending = computed(() => updateMutation.isPending.value);
const updateError = computed(() => updateMutation.error.value);
const hasUpdateError = computed(() => Boolean(updateError.value));

const handleClose = () => {
  selectedStatus.value = "OPEN";
  emit("close");
};

const handleConfirm = async () => {
  await updateMutation.mutateAsync({
    id: props.prId,
    status: selectedStatus.value,
  });

  handleClose();
};

const resetUpdateMutation = () => {
  updateMutation.reset();
};
</script>

<style lang="scss" scoped>
.status-options {
  display: flex;
  gap: var(--sys-spacing-small);
  margin-bottom: var(--sys-spacing-medium);
}

.status-option {
  @include mx.pu-font(label-large);
  flex: 1;
  justify-content: center;
  min-width: 0;
}

.modal-actions {
  display: flex;
  gap: var(--sys-spacing-small);

  :deep(.ui-button) {
    flex: 1;
    min-width: 66px;
  }
}

</style>
