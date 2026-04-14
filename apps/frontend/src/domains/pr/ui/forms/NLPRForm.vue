<template>
  <form class="nl-form" @submit.prevent="onSubmit">
    <Field name="rawText" v-slot="{ field, errors }">
      <div class="field-wrapper">
        <TextareaInput
          input-id="pr-text"
          :model-value="field.value"
          @update:model-value="field.onChange"
          :disabled="isSubmitting"
          :placeholder="placeholderText"
          :rows="3"
          :max-length="120"
          show-count
          min-height="120px"
        />
        <div class="nl-actions">
          <button
            v-if="isVoiceSupported"
            type="button"
            class="voice-action"
            :class="{ 'is-recording': isVoiceRecording }"
            :disabled="isSubmitting || isVoiceProcessing"
            :aria-pressed="isVoiceRecording"
            @click="handleVoiceToggle"
          >
            <span v-if="isVoiceRecording">
              {{ t("nlForm.voiceRecording") }}
            </span>
            <span v-else-if="isVoiceProcessing">
              {{ t("nlForm.voiceProcessing") }}
            </span>
            <span v-else>
              {{ t("nlForm.voiceAction") }}
            </span>
          </button>
        </div>
        <p v-if="voiceErrorMessage" class="error-message voice-error">
          {{ voiceErrorMessage }}
        </p>
        <span v-if="errors.length" class="error-message">{{ errors[0] }}</span>
      </div>
    </Field>

    <Button type="submit" class="submit-action" :loading="isSubmitting" full-width>
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
import { computed, watch } from "vue";
import { storeToRefs } from "pinia";
import { Field, useForm } from "vee-validate";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { createNaturalLanguagePRValidationSchema } from "@/lib/validation";
import {
  useCreateCommunityPRFromNaturalLanguage,
  usePublishCommunityPR,
} from "@/domains/pr/queries/useCommunityPR";
import { communityPRDetailPath } from "@/domains/pr/routing/routes";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import { useLandingRotatingTopic } from "@/domains/landing/use-cases/useLandingRotatingTopic";
import { ensureAuthSessionBootstrapped } from "@/processes/auth/useAuthSessionBootstrap";
import Button from "@/shared/ui/actions/Button.vue";
import TextareaInput from "@/shared/ui/forms/TextareaInput.vue";
import { useNaturalLanguageDraftStore } from "@/domains/pr/use-cases/useNaturalLanguageDraft";
import { useWeChatVoiceInput } from "@/shared/wechat/useWeChatVoiceInput";

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
const draftStore = useNaturalLanguageDraftStore();
const { rawText: draftRawText } = storeToRefs(draftStore);
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

const mergeVoiceTranscript = (text: string): void => {
  const current = (values.rawText ?? "").trim();
  const merged = current.length > 0 ? `${current} ${text}` : text;
  setFieldValue("rawText", merged);
};

const {
  isSupported: isVoiceSupported,
  isRecording: isVoiceRecording,
  isProcessing: isVoiceProcessing,
  errorMessage: voiceErrorMessage,
  startRecording,
  stopRecording,
  resetError: resetVoiceError,
} = useWeChatVoiceInput({
  onTranscript: mergeVoiceTranscript,
});

const { handleSubmit, values, setFieldValue, resetForm } = useForm({
  validationSchema: createNaturalLanguagePRValidationSchema,
  initialValues: {
    rawText: draftRawText.value,
  },
});

watch(
  () => values.rawText,
  (value) => {
    draftStore.setRawText(value ?? "");
  },
  { immediate: true },
);

const resolveRawText = (): string => {
  const trimmed = (values.rawText ?? "").trim();
  if (trimmed.length > 0) {
    return values.rawText ?? "";
  }

  return placeholderText.value;
};

const submitHandler = handleSubmit(async (values) => {
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
  draftStore.clear();
  resetForm({
    values: { rawText: "" },
  });
});

const onSubmit = async () => {
  resetVoiceError();
  const resolvedText = resolveRawText();
  if (resolvedText !== values.rawText) {
    setFieldValue("rawText", resolvedText);
  }

  await submitHandler();
};

const handleVoiceToggle = async (): Promise<void> => {
  if (!isVoiceSupported.value || isSubmitting.value || isVoiceProcessing.value) {
    return;
  }

  if (isVoiceRecording.value) {
    await stopRecording();
    return;
  }

  try {
    await startRecording();
  } catch {
    // Error already captured by hook state.
  }
};
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

.nl-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: var(--sys-spacing-xs);
}

.voice-action {
  @include mx.pu-font(label-medium);
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xs);
  padding: 0 var(--sys-spacing-sm);
  height: var(--sys-size-large);
  border-radius: var(--sys-radius-sm);
  border: 1px dashed var(--sys-color-primary);
  background: color-mix(
    in srgb,
    var(--sys-color-primary-container) 72%,
    transparent
  );
  color: var(--sys-color-on-primary-container);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: none;
  cursor: pointer;
  transition:
    background-color 180ms ease,
    transform 180ms ease,
    border-color 180ms ease;

  &.is-recording {
    border-style: solid;
    background: color-mix(
      in srgb,
      var(--sys-color-primary) 16%,
      transparent
    );
  }

  &:hover:not(:disabled) {
    background: color-mix(
      in srgb,
      var(--sys-color-primary-container) 86%,
      transparent
    );
  }

  &:active:not(:disabled) {
    transform: scale(0.99);
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: not-allowed;
  }
}

.submit-action {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.error-message {
  color: var(--sys-color-error);
  @include mx.pu-font(label-medium);
}

.voice-error {
  margin: 0;
}
</style>
