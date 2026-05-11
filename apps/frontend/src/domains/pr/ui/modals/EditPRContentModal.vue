<template>
  <Modal
    :open="open"
    max-width="480px"
    :title="t('editContentModal.title')"
    @close="handleClose"
  >
    <PRForm
      ref="formRef"
      :initial-fields="initialFields"
      :show-budget-field="showBudgetField"
      :show-time-field="showTimeField"
      @submit="handleSubmit"
    />

    <div class="modal-actions">
      <div class="action-buttons">
        <button type="button" class="cancel-btn" @click="handleClose">
          {{ t("common.cancel") }}
        </button>
        <Button
          type="button"
          :loading="isUpdatePending"
          :disabled="!isFormValid"
          @click="formRef?.submitForm()"
        >
          {{ t("editContentModal.confirmAction") }}
        </Button>
      </div>
    </div>

    <ErrorToast
      v-if="hasUpdateError"
      :message="updateError?.message || t('editContentModal.updateFailed')"
      @close="resetUpdateMutation"
    />
  </Modal>
</template>

<script setup lang="ts">
import { computed, isRef, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { useUpdatePRContent } from "@/domains/pr/queries/usePRActions";
import Modal from "@/shared/ui/overlay/Modal.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import PRForm from "@/domains/pr/ui/forms/PRForm.vue";
import Button from "@/shared/ui/actions/Button.vue";
import {
  toPartnerRequestFields,
  type PRFormFields,
} from "@/domains/pr/model/types";

interface Props {
  open: boolean;
  initialFields: PRFormFields;
  prId: PRId;
  showBudgetField?: boolean;
  showTimeField?: boolean;
}

const props = defineProps<Props>();
const { t } = useI18n();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const updateMutation = useUpdatePRContent();
const formRef = ref<InstanceType<typeof PRForm> | null>(null);
const isUpdatePending = computed(() => updateMutation.isPending.value);
const updateError = computed(() => updateMutation.error.value);
const hasUpdateError = computed(() => Boolean(updateError.value));
const isFormValid = computed(() => {
  const canSubmit = formRef.value?.canSubmit;
  return isRef(canSubmit) ? canSubmit.value : Boolean(canSubmit);
});

const handleSubmit = async ({ fields }: PartnerRequestFormInput) => {
  await updateMutation.mutateAsync({
    id: props.prId,
    fields: toPartnerRequestFields(fields),
  });

  emit("success");
  handleClose();
};

const handleClose = () => {
  emit("close");
};

const resetUpdateMutation = () => {
  updateMutation.reset();
};
</script>

<style lang="scss" scoped>
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-medium);
  margin-top: var(--sys-spacing-large);
}

.action-buttons {
  display: flex;
  gap: var(--sys-spacing-small);

  :deep(.ui-button) {
    flex: 1;
    min-width: 66px;
  }
}

.cancel-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  min-width: 66px;
  padding: var(--sys-spacing-small);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-xsmall);
  background: transparent;
  cursor: pointer;
}
</style>
