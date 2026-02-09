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
        <span class="required">{{
          t("partnerRequestForm.requiredMark")
        }}</span></label
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

    <div v-if="!pinHidden" class="form-field pin-field">
      <PinInput
        v-model="pinModel"
        :pr-id="pinPrId"
        :auto-generate="pinAutoGenerate"
        :allow-regenerate="pinAllowRegenerate"
        :show-label="pinShowLabel"
        :show-info="pinShowInfo"
      />
      <span v-if="errors.pin" class="error-message">{{ errors.pin }}</span>
    </div>

    <button
      type="button"
      class="advanced-toggle"
      :aria-expanded="isAdvancedOpen"
      @click="isAdvancedOpen = !isAdvancedOpen"
    >
      {{
        isAdvancedOpen
          ? t("partnerRequestForm.advancedHide")
          : t("partnerRequestForm.advancedShow")
      }}
    </button>

    <Transition name="advanced-fields">
      <div v-if="isAdvancedOpen" class="advanced-section">
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
              <span
                v-for="(pref, index) in preferencesModel"
                :key="index"
                class="tag"
              >
                {{ pref }}
                <button
                  type="button"
                  class="remove-tag"
                  @click="removePreference(index)"
                >
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
      </div>
    </Transition>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields, PRId } from "@partner-up-dev/backend";
import { useForm } from "vee-validate";
import type { PartnerRequestFormInput } from "@/lib/validation";
import {
  partnerRequestFormOptionalPinValidationSchema,
  partnerRequestFormValidationSchema,
} from "@/lib/validation";
import DateTimeRangePicker from "@/components/pr/DateTimeRangePicker.vue";
import PinInput from "@/components/common/PinInput.vue";
import { clonePRFields, parseNullableNumber } from "./pr-form";

const props = defineProps<{
  initialFields: PartnerRequestFields;
  pinPrId?: PRId | null;
  pinAutoGenerate?: boolean;
  pinAllowRegenerate?: boolean;
  pinShowLabel?: boolean;
  pinShowInfo?: boolean;
  pinRequired?: boolean;
  pinHidden?: boolean;
}>();
const { t } = useI18n();

const emit = defineEmits<{
  submit: [payload: PartnerRequestFormInput];
}>();

const {
  defineField,
  values,
  errors,
  resetForm,
  handleSubmit,
  setFieldValue,
  meta,
} = useForm<PartnerRequestFormInput>({
  validationSchema:
    props.pinRequired === false
      ? partnerRequestFormOptionalPinValidationSchema
      : partnerRequestFormValidationSchema,
  initialValues: {
    fields: clonePRFields(props.initialFields),
    pin: "",
  },
});

watch(
  () => props.initialFields,
  (nextFields) => {
    resetForm({
      values: {
        fields: clonePRFields(nextFields),
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
const isAdvancedOpen = ref(false);

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

<style scoped lang="scss" src="./PRForm.scss"></style>
