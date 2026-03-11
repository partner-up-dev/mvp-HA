<template>
  <form class="nl-form" @submit.prevent="onSubmit">
    <Field name="rawText" v-slot="{ field, errors }">
      <div class="field-wrapper">
        <PRInput
          :model-value="field.value"
          @update:model-value="field.onChange"
          :disabled="isSubmitting"
          :placeholder="placeholderText"
        />
        <span v-if="errors.length" class="error-message">{{ errors[0] }}</span>
      </div>
    </Field>

    <Button type="submit" :loading="isSubmitting" full-width>
      {{ t("nlForm.submit") }}
    </Button>

    <LoadingIndicator v-if="isSubmitting" :message="t('nlForm.parsing')" />

    <ErrorToast
      v-if="createMutation.isError.value || publishMutation.isError.value"
      :message="submitErrorMessage"
      @close="
        createMutation.reset();
        publishMutation.reset();
      "
    />
  </form>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Field, useForm } from "vee-validate";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useUserSessionStore } from "@/stores/userSessionStore";
import { createNaturalLanguagePRValidationSchema } from "@/lib/validation";
import {
  useCreateCommunityPRFromNaturalLanguage,
  usePublishCommunityPR,
} from "@/domains/pr/queries/useCommunityPR";
import { communityPRDetailPath } from "@/domains/pr/routing/routes";
import PRInput from "@/domains/pr/ui/forms/PRInput.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import { useLandingRotatingTopic } from "@/domains/landing/use-cases/useLandingRotatingTopic";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import Button from "@/shared/ui/actions/Button.vue";

const getLocalWeekdayLabel = (date: Date): string => {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(date);
};

const router = useRouter();
const { t } = useI18n();
const userSessionStore = useUserSessionStore();
const createMutation = useCreateCommunityPRFromNaturalLanguage();
const publishMutation = usePublishCommunityPR();
const { rotatingTopicExample } = useLandingRotatingTopic();
const placeholderText = computed(() =>
  t("prInput.placeholder", { example: rotatingTopicExample.value }),
);
const isSubmitting = computed(
  () => createMutation.isPending.value || publishMutation.isPending.value,
);
const submitErrorMessage = computed(
  () =>
    createMutation.error.value?.message ||
    publishMutation.error.value?.message ||
    t("nlForm.createFailed"),
);

const { handleSubmit } = useForm({
  validationSchema: createNaturalLanguagePRValidationSchema,
  initialValues: {
    rawText: "",
  },
});

const onSubmit = handleSubmit(async (values) => {
  await ensureAuthSessionBootstrapped();

  const now = new Date();
  const draft = await createMutation.mutateAsync({
    rawText: values.rawText,
    nowIso: now.toISOString(),
    nowWeekday: getLocalWeekdayLabel(now),
  });

  const publishResult = await publishMutation.mutateAsync({ id: draft.id });
  if (publishResult.auth) {
    userSessionStore.applyAuthSession(publishResult.auth);
  }

  await router.push(`${communityPRDetailPath(draft.id)}?entry=create`);
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
