<template>
  <form class="partner-request-form" @submit.prevent="submitForm">
    <div class="form-field">
      <label>{{ t("partnerRequestForm.title") }}</label>
      <input
        v-model="titleInput"
        type="text"
        :placeholder="t('partnerRequestForm.titlePlaceholder')"
      />
    </div>

    <div class="form-field">
      <label
        >{{ t("partnerRequestForm.type") }}
        <span class="required">{{ t("partnerRequestForm.requiredMark") }}</span></label
      >
      <input
        v-model="typeModel"
        type="text"
        :placeholder="t('partnerRequestForm.typePlaceholder')"
      />
      <span v-if="errors['fields.type']" class="error-message">
        {{ errors["fields.type"] }}
      </span>
    </div>

    <DateTimeRangePicker v-model="timeModel" />

    <div class="form-field">
      <label>{{ t("partnerRequestForm.location") }}</label>
      <input
        v-model="locationInput"
        type="text"
        :placeholder="t('partnerRequestForm.locationPlaceholder')"
      />
    </div>

    <div class="form-field">
      <label>{{ t("partnerRequestForm.minPartners") }}</label>
      <input
        :value="minPartnersInput"
        type="number"
        :placeholder="t('partnerRequestForm.minPartnersPlaceholder')"
        @input="onMinPartnersInput"
      />
    </div>

    <div class="form-field">
      <label>{{ t("partnerRequestForm.maxPartners") }}</label>
      <input
        :value="maxPartnersInput"
        type="number"
        :placeholder="t('partnerRequestForm.maxPartnersPlaceholder')"
        @input="onMaxPartnersInput"
      />
    </div>

    <div class="form-field">
      <label>{{ t("partnerRequestForm.budget") }}</label>
      <input
        v-model="budgetInput"
        type="text"
        :placeholder="t('partnerRequestForm.budgetPlaceholder')"
      />
    </div>

    <div class="form-field">
      <label>{{ t("partnerRequestForm.preferences") }}</label>
      <div class="tags-input">
        <div class="tags">
          <span v-for="(pref, index) in preferencesModel" :key="index" class="tag">
            {{ pref }}
            <button type="button" class="remove-tag" @click="removePreference(index)">
              {{ t("partnerRequestForm.removePreference") }}
            </button>
          </span>
        </div>
        <input
          v-model="newPreference"
          type="text"
          :placeholder="t('partnerRequestForm.preferencesPlaceholder')"
          @keydown.enter.prevent="addPreference"
        />
      </div>
    </div>

    <div class="form-field">
      <label>{{ t("partnerRequestForm.notes") }}</label>
      <textarea
        v-model="notesInput"
        rows="3"
        :placeholder="t('partnerRequestForm.notesPlaceholder')"
      />
    </div>

    <div class="form-field pin-field">
      <label
        >{{ t("partnerRequestForm.pin") }}
        <span class="required">{{ t("partnerRequestForm.requiredMark") }}</span></label
      >
      <input
        v-model="pinModel"
        type="password"
        inputmode="numeric"
        maxlength="4"
        :placeholder="t('partnerRequestForm.pinPlaceholder')"
      />
      <span v-if="errors.pin" class="error-message">{{ errors.pin }}</span>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import { useForm } from "vee-validate";
import type { PartnerRequestFormInput } from "@/lib/validation";
import { partnerRequestFormValidationSchema } from "@/lib/validation";
import DateTimeRangePicker from "@/components/DateTimeRangePicker.vue";

const props = defineProps<{
  initialFields: PartnerRequestFields;
}>();
const { t } = useI18n();

const emit = defineEmits<{
  submit: [payload: PartnerRequestFormInput];
}>();

const cloneFields = (fields: PartnerRequestFields): PartnerRequestFields => ({
  title: fields.title,
  type: fields.type,
  time: [fields.time[0], fields.time[1]],
  location: fields.location,
  expiresAt: fields.expiresAt,
  partners: [fields.partners[0], fields.partners[1], fields.partners[2]],
  budget: fields.budget,
  preferences: [...fields.preferences],
  notes: fields.notes,
});

const {
  defineField,
  values,
  errors,
  resetForm,
  handleSubmit,
  setFieldValue,
  meta,
} = useForm<PartnerRequestFormInput>({
  validationSchema: partnerRequestFormValidationSchema,
  initialValues: {
    fields: cloneFields(props.initialFields),
    pin: "",
  },
});

watch(
  () => props.initialFields,
  (nextFields) => {
    resetForm({
      values: {
        fields: cloneFields(nextFields),
        pin: "",
      },
    });
  },
  { deep: true },
);

const [titleModel] = defineField("fields.title");
const [typeModel] = defineField("fields.type");
const [timeModel] = defineField("fields.time");
const [locationModel] = defineField("fields.location");
const [budgetModel] = defineField("fields.budget");
const [notesModel] = defineField("fields.notes");
const [preferencesModel] = defineField("fields.preferences");
const [pinModel] = defineField("pin");

const titleInput = computed({
  get: () => titleModel.value ?? "",
  set: (value: string) => {
    titleModel.value = value.trim().length === 0 ? undefined : value;
  },
});

const locationInput = computed({
  get: () => locationModel.value ?? "",
  set: (value: string) => {
    locationModel.value = value.trim().length === 0 ? null : value;
  },
});

const budgetInput = computed({
  get: () => budgetModel.value ?? "",
  set: (value: string) => {
    budgetModel.value = value.trim().length === 0 ? null : value;
  },
});

const notesInput = computed({
  get: () => notesModel.value ?? "",
  set: (value: string) => {
    notesModel.value = value.trim().length === 0 ? null : value;
  },
});

const minPartnersInput = computed(() =>
  values.fields.partners[0] === null ? "" : String(values.fields.partners[0]),
);
const maxPartnersInput = computed(() =>
  values.fields.partners[2] === null ? "" : String(values.fields.partners[2]),
);

const parseNullableNumber = (value: string): number | null => {
  if (value.trim().length === 0) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const onMinPartnersInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  const nextMin = parseNullableNumber(value);
  setFieldValue("fields.partners", [
    nextMin,
    values.fields.partners[1],
    values.fields.partners[2],
  ]);
};

const onMaxPartnersInput = (event: Event) => {
  const value = (event.target as HTMLInputElement).value;
  const nextMax = parseNullableNumber(value);
  setFieldValue("fields.partners", [
    values.fields.partners[0],
    values.fields.partners[1],
    nextMax,
  ]);
};

const newPreference = ref("");

const addPreference = () => {
  const pref = newPreference.value.trim();
  if (!pref || preferencesModel.value.includes(pref)) return;
  preferencesModel.value = [...preferencesModel.value, pref];
  newPreference.value = "";
};

const removePreference = (index: number) => {
  preferencesModel.value = preferencesModel.value.filter((_, i) => i !== index);
};

const submitForm = handleSubmit((formValues) => {
  emit("submit", formValues);
});

const canSubmit = computed(() => meta.value.valid);

defineExpose({
  submitForm,
  canSubmit,
});
</script>

<style lang="scss" scoped>
.form-field {
  margin-bottom: var(--sys-spacing-med);

  label {
    @include mx.pu-font(label-medium);
    display: block;
    margin-bottom: var(--sys-spacing-xs);
    color: var(--sys-color-on-surface-variant);

    .required {
      color: var(--sys-color-error);
    }
  }

  input,
  textarea {
    @include mx.pu-font(body-large);
    width: 100%;
    padding: var(--sys-spacing-sm);
    border: 1px solid var(--sys-color-outline);
    border-radius: var(--sys-radius-sm);
    background: var(--sys-color-surface-container);
    color: var(--sys-color-on-surface);

    &::placeholder {
      color: var(--sys-color-on-surface-variant);
      opacity: 0.6;
    }

    &:focus {
      outline: 2px solid var(--sys-color-primary);
      outline-offset: -1px;
    }
  }

  textarea {
    resize: vertical;
    min-height: 60px;
  }
}

.pin-field input {
  @include mx.pu-font(title-medium);
  text-align: center;
  letter-spacing: 0.5em;
}

.tags-input {
  border: 1px solid var(--sys-color-outline);
  border-radius: var(--sys-radius-sm);
  padding: var(--sys-spacing-xs);
  background: var(--sys-color-surface-container);

  .tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--sys-spacing-xs);
    margin-bottom: var(--sys-spacing-xs);
  }

  .tag {
    @include mx.pu-font(label-small);
    display: inline-flex;
    align-items: center;
    gap: var(--sys-spacing-xs);
    padding: 2px var(--sys-spacing-xs);
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
    border-radius: var(--sys-radius-sm);
  }

  input {
    border: none;
    background: none;
    padding: var(--sys-spacing-xs);
    width: 100%;

    &:focus {
      outline: none;
    }
  }
}

.remove-tag {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
}

.error-message {
  display: block;
  margin-top: var(--sys-spacing-xs);
  color: var(--sys-color-error);
  @include mx.pu-font(label-medium);
}
</style>
