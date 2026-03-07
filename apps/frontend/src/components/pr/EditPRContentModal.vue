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
      :show-budget-field="scenario === 'COMMUNITY'"
      @submit="handleSubmit"
    />

    <div class="modal-actions">
      <div v-if="requiresPin" class="pin-input">
        <label>{{ t("modifyStatusModal.pinLabel") }}</label>
        <PinInput
          v-model="editPin"
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
          :loading="isUpdatePending"
          :disabled="!isFormValid"
          @click="formRef?.submitForm()"
        >
          {{ t("editContentModal.confirmAction") }}
        </SubmitButton>
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
import type { PRId, PRKind } from "@partner-up-dev/backend";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { useUpdateAnchorPRContent } from "@/queries/useAnchorPR";
import { useUpdateCommunityPRContent } from "@/queries/useCommunityPR";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/stores/userSessionStore";
import Modal from "@/components/common/Modal.vue";
import SubmitButton from "@/components/common/SubmitButton.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import PRForm from "@/components/pr/PRForm.vue";
import PinInput from "@/components/common/PinInput.vue";
import {
  toAnchorPRFields,
  toCommunityPRFields,
  type PRFormFields,
} from "@/entities/pr/types";

interface Props {
  open: boolean;
  initialFields: PRFormFields;
  prId: PRId;
  scenario: PRKind;
}

const props = defineProps<Props>();
const { t } = useI18n();
const emit = defineEmits<{
  close: [];
  success: [];
}>();

const communityUpdateMutation = useUpdateCommunityPRContent();
const anchorUpdateMutation = useUpdateAnchorPRContent();
const userSessionStore = useUserSessionStore();
const formRef = ref<InstanceType<typeof PRForm> | null>(null);
const editPin = ref("");
const requiresPin = computed(() => userSessionStore.role === "anonymous");
const getUpdateMutation = () =>
  props.scenario === "ANCHOR" ? anchorUpdateMutation : communityUpdateMutation;
const isUpdatePending = computed(() => getUpdateMutation().isPending.value);
const hasUpdateError = computed(() => getUpdateMutation().isError.value);
const updateError = computed(() => getUpdateMutation().error.value);
const isFormValid = computed(() => {
  const canSubmit = formRef.value?.canSubmit;
  const formOk = isRef(canSubmit) ? canSubmit.value : Boolean(canSubmit);
  if (!requiresPin.value) {
    return formOk;
  }
  return formOk && editPin.value.length === 4;
});

const handleSubmit = async ({ fields }: PartnerRequestFormInput) => {
  const pin = requiresPin.value ? editPin.value : undefined;
  if (requiresPin.value && (!pin || pin.length !== 4)) return;

  const result =
    props.scenario === "ANCHOR"
      ? await anchorUpdateMutation.mutateAsync({
          id: props.prId,
          fields: toAnchorPRFields(fields),
          pin,
        })
      : await communityUpdateMutation.mutateAsync({
          id: props.prId,
          fields: toCommunityPRFields(fields),
          pin,
        });

  const authPayload = (result as { auth?: AuthSessionPayload | null }).auth;
  if (authPayload) {
    userSessionStore.applyAuthSession(authPayload);
  }

  emit("success");
  handleClose();
};

const handleClose = () => {
  editPin.value = "";
  emit("close");
};

const resetUpdateMutation = () => {
  getUpdateMutation().reset();
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
