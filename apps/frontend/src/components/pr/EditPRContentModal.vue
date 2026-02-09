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
      :pin-auto-generate="false"
      :pin-allow-regenerate="false"
      :pin-show-info="false"
      :pin-hidden="true"
      :pin-required="false"
      @submit="handleSubmit"
    />

    <div class="modal-actions">
      <div class="pin-input">
        <label>{{ t("modifyStatusModal.pinLabel") }}</label>
        <PinInput
          v-model="editPin"
          :pr-id="prId"
          :auto-generate="false"
          :allow-regenerate="false"
          :show-label="false"
          :show-info="false"
        />
      </div>
      <div class="action-buttons">
        <button type="button" class="cancel-btn" @click="handleClose">
          {{ t("common.cancel") }}
        </button>
        <SubmitButton
          type="button"
          :loading="updateMutation.isPending.value"
          :disabled="!isFormValid"
          @click="formRef?.submitForm()"
        >
          {{ t("editContentModal.confirmAction") }}
        </SubmitButton>
      </div>
    </div>

    <ErrorToast
      v-if="updateMutation.isError.value"
      :message="
        updateMutation.error.value?.message ||
        t('editContentModal.updateFailed')
      "
      @close="updateMutation.reset()"
    />
  </Modal>
</template>

<script setup lang="ts">
import { computed, isRef, ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields, PRId } from "@partner-up-dev/backend";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { useUpdatePRContent } from "@/queries/useUpdatePRContent";
import Modal from "@/components/common/Modal.vue";
import SubmitButton from "@/components/common/SubmitButton.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import PRForm from "@/components/pr/PRForm.vue";
import PinInput from "@/components/common/PinInput.vue";

interface Props {
  open: boolean;
  initialFields: PartnerRequestFields;
  prId: PRId;
}

const props = defineProps<Props>();
const { t } = useI18n();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const updateMutation = useUpdatePRContent();
const formRef = ref<InstanceType<typeof PRForm> | null>(null);
const editPin = ref("");
const isFormValid = computed(() => {
  const canSubmit = formRef.value?.canSubmit;
  const formOk = isRef(canSubmit) ? canSubmit.value : Boolean(canSubmit);
  return formOk && editPin.value.length === 4;
});

const handleSubmit = async ({ fields }: PartnerRequestFormInput) => {
  if (editPin.value.length !== 4) return;
  await updateMutation.mutateAsync({
    id: props.prId,
    fields,
    pin: editPin.value,
  });

  emit("success");
  handleClose();
};

const handleClose = () => {
  editPin.value = "";
  emit("close");
};
</script>

<style lang="scss" scoped>
.modal-actions {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  margin-top: var(--sys-spacing-lg);
}

.pin-input {
  label {
    @include mx.pu-font(label-medium);
    display: block;
    margin-bottom: var(--sys-spacing-xs);
    color: var(--sys-color-on-surface-variant);
  }
}

.action-buttons {
  display: flex;
  gap: var(--sys-spacing-sm);
}

.cancel-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  min-width: 66px;
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-xs);
  background: transparent;
  cursor: pointer;
}
</style>
