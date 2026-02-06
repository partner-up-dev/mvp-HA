<template>
  <Modal
    :open="open"
    max-width="480px"
    :title="t('editContentModal.title')"
    @close="$emit('close')"
  >
    <PartnerRequestForm
      ref="formRef"
      :initial-fields="initialFields"
      @submit="handleSubmit"
    />

    <div class="modal-actions">
      <button type="button" class="cancel-btn" @click="$emit('close')">
        {{ t("common.cancel") }}
      </button>
      <SubmitButton
        type="button"
        :loading="updateMutation.isPending.value"
        @click="formRef?.submitForm()"
      >
        {{ t("editContentModal.confirmAction") }}
      </SubmitButton>
    </div>

    <ErrorToast
      v-if="updateMutation.isError.value"
      :message="updateMutation.error.value?.message || t('editContentModal.updateFailed')"
      @close="updateMutation.reset()"
    />
  </Modal>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields, PRId } from "@partner-up-dev/backend";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { useUpdatePRContent } from "@/queries/useUpdatePRContent";
import Modal from "@/components/Modal.vue";
import SubmitButton from "@/components/SubmitButton.vue";
import ErrorToast from "@/components/ErrorToast.vue";
import PartnerRequestForm from "@/components/PartnerRequestForm.vue";

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
const formRef = ref<InstanceType<typeof PartnerRequestForm> | null>(null);

const handleSubmit = async ({ fields, pin }: PartnerRequestFormInput) => {
  await updateMutation.mutateAsync({
    id: props.prId,
    fields,
    pin,
  });

  emit("success");
  emit("close");
};
</script>

<style lang="scss" scoped>
.modal-actions {
  display: flex;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
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
