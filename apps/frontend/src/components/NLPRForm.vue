<template>
  <form class="nl-form" @submit.prevent="onSubmit">
    <Field name="rawText" v-slot="{ field, errors }">
      <div class="field-wrapper">
        <PRInput
          :model-value="field.value"
          @update:model-value="field.onChange"
          :disabled="mutation.isPending.value"
        />
        <span v-if="errors.length" class="error-message">{{ errors[0] }}</span>
      </div>
    </Field>

    <Field name="pin" v-slot="{ field, errors }">
      <div class="field-wrapper">
        <PINInput
          :model-value="field.value"
          @update:model-value="field.onChange"
          :disabled="mutation.isPending.value"
        />
        <span v-if="errors.length" class="error-message">{{ errors[0] }}</span>
      </div>
    </Field>

    <SubmitButton type="submit" :loading="mutation.isPending.value">
      {{ t("nlForm.submit") }}
    </SubmitButton>

    <LoadingState
      v-if="mutation.isPending.value"
      :message="t('nlForm.parsing')"
    />

    <ErrorToast
      v-if="mutation.isError.value"
      :message="mutation.error.value?.message || t('nlForm.createFailed')"
      @close="mutation.reset()"
    />
  </form>
</template>

<script setup lang="ts">
import { Field, useForm } from "vee-validate";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useUserPRStore } from "@/stores/userPRStore";
import { createNaturalLanguagePRValidationSchema } from "@/lib/validation";
import { useCreatePRFromNaturalLanguage } from "@/queries/useCreatePR";
import PRInput from "@/components/PRInput.vue";
import PINInput from "@/components/PINInput.vue";
import SubmitButton from "@/components/SubmitButton.vue";
import LoadingState from "@/components/LoadingState.vue";
import ErrorToast from "@/components/ErrorToast.vue";

const router = useRouter();
const { t } = useI18n();
const userPRStore = useUserPRStore();
const mutation = useCreatePRFromNaturalLanguage();

const { handleSubmit } = useForm({
  validationSchema: createNaturalLanguagePRValidationSchema,
  initialValues: {
    rawText: "",
    pin: "",
  },
});

const onSubmit = handleSubmit(async (values) => {
  const result = await mutation.mutateAsync({
    rawText: values.rawText,
    pin: values.pin,
    nowIso: new Date().toISOString(),
  });

  userPRStore.addCreatedPR(result.id);
  await router.push(`/pr/${result.id}`);
});
</script>

<style lang="scss" scoped>
.nl-form {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.field-wrapper {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.error-message {
  color: var(--sys-color-error);
  @include mx.pu-font(label-medium);
}
</style>
