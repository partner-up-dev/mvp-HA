<template>
  <form class="home-nl-form" @submit.prevent="onSubmit">
    <Field name="rawText" v-slot="{ field, errors }">
      <div class="row row--input">
        <input
          class="nl-input"
          type="text"
          :value="field.value"
          @input="
            field.onChange(($event.target as HTMLInputElement).value)
          "
          :placeholder="placeholderText"
          :disabled="mutation.isPending.value"
          maxlength="2000"
          autocomplete="off"
        />
      </div>
      <span v-if="errors.length" class="error-message">{{ errors[0] }}</span>
    </Field>

    <Field name="pin" v-slot="{ field, errors }">
      <div class="row row--action">
        <PinInput
          class="pin-input"
          :model-value="field.value"
          @update:model-value="field.onChange"
          :pr-id="createdPrId"
          :disabled="mutation.isPending.value"
          :show-label="false"
          :show-info="false"
          :allow-regenerate="false"
        />
        <button
          class="send-button"
          type="submit"
          :disabled="mutation.isPending.value"
          :aria-label="t('nlForm.submit')"
        >
          <span
            v-if="mutation.isPending.value"
            class="spinner"
            aria-hidden="true"
          ></span>
          <span
            v-else
            class="i-mdi-send-outline send-icon"
            aria-hidden="true"
          ></span>
          <span class="send-label">{{ t("nlForm.submit") }}</span>
        </button>
      </div>
      <span v-if="errors.length" class="error-message">{{ errors[0] }}</span>
    </Field>

    <ErrorToast
      v-if="mutation.isError.value"
      :message="mutation.error.value?.message || t('nlForm.createFailed')"
      @close="mutation.reset()"
    />
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from "vue";
import { Field, useForm } from "vee-validate";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import PinInput from "@/components/common/PinInput.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import { useUserPRStore } from "@/stores/userPRStore";
import { createNaturalLanguagePRValidationSchema } from "@/lib/validation";
import { useCreatePRFromNaturalLanguage } from "@/queries/useCreatePR";
import { useHomeRotatingTopic } from "@/composables/useHomeRotatingTopic";

const getLocalWeekdayLabel = (date: Date): string => {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
  }).format(date);
};

const router = useRouter();
const { t } = useI18n();
const userPRStore = useUserPRStore();
const mutation = useCreatePRFromNaturalLanguage();
const createdPrId = ref<PRId | null>(null);
const { rotatingTopicExample } = useHomeRotatingTopic();
const placeholderText = computed(() =>
  t("prInput.placeholder", { example: rotatingTopicExample.value }),
);

const { handleSubmit } = useForm({
  validationSchema: createNaturalLanguagePRValidationSchema,
  initialValues: {
    rawText: "",
    pin: "",
  },
});

const onSubmit = handleSubmit(async (values) => {
  const now = new Date();
  const result = await mutation.mutateAsync({
    rawText: values.rawText,
    pin: values.pin,
    nowIso: now.toISOString(),
    nowWeekday: getLocalWeekdayLabel(now),
  });

  createdPrId.value = result.id;
  await nextTick();
  userPRStore.addCreatedPR(result.id);
  await router.push(`/pr/${result.id}`);
});
</script>

<style lang="scss" scoped>
.home-nl-form {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.row {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
}

.row--input {
  width: 100%;
}

.nl-input {
  @include mx.pu-font(body-large);
  width: 100%;
  height: 2.9rem;
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  background: color-mix(
    in srgb,
    var(--sys-color-surface-container-low) 70%,
    transparent
  );
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
    background: var(--sys-color-surface-container-low);
  }

  &:disabled {
    opacity: var(--sys-opacity-disabled);
  }
}

.row--action {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
}

.pin-input {
  min-width: 0;

  :deep(.pin-field) {
    text-align: left;
    letter-spacing: 0.2rem;
    padding-left: var(--sys-spacing-med);
    padding-right: var(--sys-spacing-med);
    background: color-mix(
      in srgb,
      var(--sys-color-surface-container-low) 70%,
      transparent
    );
  }
}

.send-button {
  @include mx.pu-font(label-large);
  min-width: 4.8rem;
  height: var(--sys-size-large);
  border: 1px solid color-mix(in srgb, var(--sys-color-primary) 52%, transparent);
  border-radius: var(--sys-radius-sm);
  background: color-mix(in srgb, var(--sys-color-primary) 14%, transparent);
  color: var(--sys-color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.28rem;
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

.send-label {
  @include mx.pu-font(label-medium);
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
  .nl-input {
    height: 3.1rem;
  }

  .send-button {
    min-width: 5.2rem;
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
