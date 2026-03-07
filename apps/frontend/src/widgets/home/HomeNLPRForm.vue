<template>
  <form class="home-nl-form" @submit.prevent="onSubmit">
    <Field name="rawText" v-slot="{ field, errors }">
      <div class="row row--input">
        <input
          class="nl-input"
          type="text"
          :value="field.value"
          @input="field.onChange(($event.target as HTMLInputElement).value)"
          :placeholder="placeholderText"
          :disabled="isSubmitting"
          maxlength="2000"
          autocomplete="off"
        />
        <button
          class="send-button"
          type="submit"
          :disabled="isSubmitting"
          :aria-label="t('nlForm.submit')"
        >
          <span
            v-if="isSubmitting"
            class="spinner"
            aria-hidden="true"
          ></span>
          <span
            v-else
            class="i-mdi-send-outline send-icon"
            aria-hidden="true"
          ></span>
        </button>
      </div>
      <span
        v-if="errors.length"
        class="error-message"
        style="flex-basis: 100%"
        >{{ errors[0] }}</span
      >
    </Field>

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
import ErrorToast from "@/components/common/ErrorToast.vue";
import { useUserSessionStore } from "@/stores/userSessionStore";
import { createNaturalLanguagePRValidationSchema } from "@/lib/validation";
import {
  useCreateCommunityPRFromNaturalLanguage,
  usePublishCommunityPR,
} from "@/queries/useCommunityPR";
import { communityPRDetailPath } from "@/entities/pr/routes";
import { useHomeRotatingTopic } from "@/composables/useHomeRotatingTopic";
import { ensureAuthSessionBootstrapped } from "@/composables/useAuthSessionBootstrap";

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
const { rotatingTopicExample } = useHomeRotatingTopic();
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
.home-nl-form {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
  align-items: flex-start;
}

.row {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
}

.row--input {
  flex: 1;
  min-width: 0;
}

.nl-input {
  @include mx.pu-font(body-large);
  width: 100%;
  height: var(--sys-size-large);
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-surface-container);
  color: var(--sys-color-on-surface);
  padding: 0 var(--sys-spacing-med);
  transition:
    border-color 180ms ease,
    background-color 180ms ease;

  &::placeholder {
    color: var(--sys-color-on-surface-variant);
  }

  &:focus {
    outline: none;
    border-color: var(--sys-color-primary);
    background: var(--sys-color-surface);
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
  }
}

.row--action {
  flex-shrink: 0;
}

.send-button {
  @include mx.pu-font(label-large);
  min-width: 4.8rem;
  height: var(--sys-size-large);
  border: 1px solid var(--sys-color-primary);
  border-radius: var(--sys-radius-sm);
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--sys-spacing-xs);
  padding: 0 var(--sys-spacing-sm);
  cursor: pointer;
  transition:
    opacity 180ms ease,
    transform 180ms ease,
    border-color 180ms ease,
    background-color 180ms ease;

  &:hover:not(:disabled) {
    opacity: 0.92;
    border-color: color-mix(in srgb, var(--sys-color-primary) 72%, transparent);
  }

  &:active:not(:disabled) {
    transform: scale(0.98);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
    cursor: not-allowed;
  }
}

.send-icon {
  @include mx.pu-icon(small, true);
}

.spinner {
  width: 0.9rem;
  height: 0.9rem;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 999px;
  animation: spin 800ms linear infinite;
}

.error-message {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-error);
}

@media (max-width: 768px) {
  .home-nl-form {
    gap: var(--sys-spacing-xs);
  }

  .send-button {
    min-width: var(--sys-size-large);
  }

  .send-label {
    @include mx.pu-font(label-large);
  }
}

@media (prefers-reduced-motion: reduce) {
  .send-button,
  .spinner {
    transition: none !important;
    animation: none !important;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
