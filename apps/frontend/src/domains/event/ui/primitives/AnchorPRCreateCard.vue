<template>
  <ExpandableCard
    :title="t('anchorEvent.createCard.title')"
    :subtitle="t('anchorEvent.createCard.subtitle')"
  >
    <div class="create-card">
      <label class="create-card__field">
        <span class="create-card__label">{{
          t("anchorEvent.createCard.locationLabel")
        }}</span>
        <select v-model="selectedLocationId" class="create-card__input">
          <option value="">{{ t("anchorEvent.createCard.locationPlaceholder") }}</option>
          <option
            v-for="option in locationOptions"
            :key="option.locationId"
            :value="option.locationId"
            :disabled="option.disabled"
          >
            {{ formatLocationOptionLabel(option) }}
          </option>
        </select>
      </label>

      <p class="create-card__hint">
        {{ t("anchorEvent.createCard.bookingHint") }}
      </p>

      <p v-if="errorMessage" class="create-card__error">{{ errorMessage }}</p>

      <button
        type="button"
        class="create-card__action"
        :disabled="pending"
        @click="emitCreate"
      >
        {{
          pending
            ? t("anchorEvent.createCard.creatingAction")
            : t("anchorEvent.createCard.createAction")
        }}
      </button>
    </div>
  </ExpandableCard>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import ExpandableCard from "@/shared/ui/containers/ExpandableCard.vue";

type LocationOption = {
  locationId: string;
  remainingQuota: number;
  disabled: boolean;
  disabledReason: "NONE" | "MAX_REACHED";
};

const props = withDefaults(
  defineProps<{
    locationOptions: LocationOption[];
    pending?: boolean;
    errorMessage?: string | null;
  }>(),
  {
    pending: false,
    errorMessage: null,
  },
);

const emit = defineEmits<{
  create: [locationId: string | null];
}>();

const { t } = useI18n();

const selectedLocationId = ref("");

const selectFirstAvailable = () => {
  const firstAvailable = props.locationOptions.find((option) => !option.disabled);
  selectedLocationId.value = firstAvailable?.locationId ?? "";
};

watch(
  () => props.locationOptions,
  () => {
    if (
      selectedLocationId.value.length > 0 &&
      props.locationOptions.some(
        (option) =>
          option.locationId === selectedLocationId.value && !option.disabled,
      )
    ) {
      return;
    }
    selectFirstAvailable();
  },
  { immediate: true, deep: true },
);

const formatLocationOptionLabel = (option: LocationOption): string => {
  if (option.disabled && option.disabledReason === "MAX_REACHED") {
    return t("anchorEvent.createCard.optionMaxReached", {
      locationId: option.locationId,
    });
  }
  return t("anchorEvent.createCard.optionRemaining", {
    locationId: option.locationId,
    count: option.remainingQuota,
  });
};

const emitCreate = () => {
  const normalized = selectedLocationId.value.trim();
  emit("create", normalized.length > 0 ? normalized : null);
};
</script>

<style lang="scss" scoped>
.create-card {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.create-card__field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.create-card__label {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
}

.create-card__input {
  @include mx.pu-field-shell(compact-surface);
  min-height: var(--sys-size-large);
}

.create-card__hint {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.create-card__error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}

.create-card__action {
  @include mx.pu-pill-action(solid-primary, small);
  border: none;
  cursor: pointer;
}

.create-card__action:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

</style>
