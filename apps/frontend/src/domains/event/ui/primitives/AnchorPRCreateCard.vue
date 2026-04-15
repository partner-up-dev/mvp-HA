<template>
  <div
    class="create-card-shell"
    :class="{ 'create-card-shell--flash': autoExpandHighlightActive }"
  >
    <ExpandableCard
      :key="expandableCardKey"
      :title="t('anchorEvent.createCard.title')"
      :subtitle="t('anchorEvent.createCard.subtitle')"
      :default-expanded="expandableDefaultExpanded"
    >
      <div class="create-card">
        <label class="create-card__field">
          <span class="create-card__label">{{
            t("anchorEvent.createCard.locationLabel")
          }}</span>
          <select v-model="selectedLocationId" class="create-card__input">
            <option value="">{{
              t("anchorEvent.createCard.locationPlaceholder")
            }}</option>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import ExpandableCard from "@/shared/ui/containers/ExpandableCard.vue";
import { useReducedMotion } from "@/shared/motion/useReducedMotion";

type LocationOption = {
  locationId: string;
  remainingQuota: number;
  disabled: boolean;
  disabledReason: "NONE" | "MAX_REACHED";
};

const AUTO_EXPAND_DELAY_MS = 1000;
const AUTO_EXPAND_FLASH_DURATION_MS = 900;

const props = withDefaults(
  defineProps<{
    locationOptions: LocationOption[];
    pending?: boolean;
    errorMessage?: string | null;
    defaultExpanded?: boolean;
    autoExpandContextKey?: string | number | null;
  }>(),
  {
    pending: false,
    errorMessage: null,
    defaultExpanded: false,
    autoExpandContextKey: null,
  },
);

const emit = defineEmits<{
  create: [locationId: string | null];
}>();

const { t } = useI18n();
const { prefersReducedMotion } = useReducedMotion();

const selectedLocationId = ref("");
const expandableDefaultExpanded = ref(props.defaultExpanded);
const expandableCardVersion = ref(0);
const autoExpandHighlightActive = ref(false);
let autoExpandTimerId: number | null = null;
let autoExpandHighlightTimerId: number | null = null;
let autoExpandHighlightAnimationFrameId: number | null = null;

const selectFirstAvailable = () => {
  const firstAvailable = props.locationOptions.find((option) => !option.disabled);
  selectedLocationId.value = firstAvailable?.locationId ?? "";
};

const expandableCardKey = computed(() => {
  const contextKey = props.autoExpandContextKey ?? "default";
  const expandedState = expandableDefaultExpanded.value ? "expanded" : "collapsed";
  return `${contextKey}:${expandedState}:${expandableCardVersion.value}`;
});

const clearAutoExpandTimer = () => {
  if (typeof window === "undefined" || autoExpandTimerId === null) {
    return;
  }

  window.clearTimeout(autoExpandTimerId);
  autoExpandTimerId = null;
};

const clearAutoExpandHighlightTimer = () => {
  if (
    typeof window === "undefined" ||
    autoExpandHighlightTimerId === null
  ) {
    return;
  }

  window.clearTimeout(autoExpandHighlightTimerId);
  autoExpandHighlightTimerId = null;
};

const clearAutoExpandHighlightAnimationFrame = () => {
  if (
    typeof window === "undefined" ||
    autoExpandHighlightAnimationFrameId === null
  ) {
    return;
  }

  window.cancelAnimationFrame(autoExpandHighlightAnimationFrameId);
  autoExpandHighlightAnimationFrameId = null;
};

const resetAutoExpandAttention = () => {
  clearAutoExpandHighlightTimer();
  clearAutoExpandHighlightAnimationFrame();
  autoExpandHighlightActive.value = false;
};

const remountExpandableCard = (expanded: boolean) => {
  expandableDefaultExpanded.value = expanded;
  expandableCardVersion.value += 1;
};

const triggerAutoExpandHighlight = () => {
  resetAutoExpandAttention();

  if (prefersReducedMotion.value || typeof window === "undefined") {
    return;
  }

  autoExpandHighlightAnimationFrameId = window.requestAnimationFrame(() => {
    autoExpandHighlightAnimationFrameId = null;
    autoExpandHighlightActive.value = true;
    autoExpandHighlightTimerId = window.setTimeout(() => {
      autoExpandHighlightTimerId = null;
      autoExpandHighlightActive.value = false;
    }, AUTO_EXPAND_FLASH_DURATION_MS);
  });
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

watch(
  [() => props.autoExpandContextKey, () => props.defaultExpanded],
  ([contextKey, shouldAutoExpand], previousValues) => {
    clearAutoExpandTimer();
    resetAutoExpandAttention();

    const previousContextKey = previousValues?.[0];
    const isFirstSync = previousValues === undefined;
    const contextChanged = !isFirstSync && contextKey !== previousContextKey;

    if (!contextChanged) {
      remountExpandableCard(shouldAutoExpand);
      return;
    }

    remountExpandableCard(false);

    if (!shouldAutoExpand) {
      return;
    }

    if (typeof window === "undefined") {
      remountExpandableCard(true);
      return;
    }

    autoExpandTimerId = window.setTimeout(() => {
      autoExpandTimerId = null;
      remountExpandableCard(true);
      triggerAutoExpandHighlight();
    }, AUTO_EXPAND_DELAY_MS);
  },
  { immediate: true },
);

watch(prefersReducedMotion, (reduced) => {
  if (!reduced) {
    return;
  }

  resetAutoExpandAttention();
});

onUnmounted(() => {
  clearAutoExpandTimer();
  resetAutoExpandAttention();
});

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
.create-card-shell :deep(.expandable-card) {
  position: relative;
  overflow: hidden;
  isolation: isolate;
}

.create-card-shell :deep(.expandable-card)::before {
  content: "";
  position: absolute;
  inset: 0;
  background: transparent;
  pointer-events: none;
  z-index: 0;
}

.create-card-shell :deep(.expandable-card__toggle),
.create-card-shell :deep(.expandable-card__content) {
  position: relative;
  z-index: 1;
}

.create-card-shell--flash :deep(.expandable-card)::before {
  animation: create-card-surface-flash 900ms ease-in-out 1;
}

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

@keyframes create-card-surface-flash {
  0% {
    background-color: transparent;
  }

  12% {
    background-color: var(--sys-color-primary-container);
  }

  24% {
    background-color: transparent;
  }

  42% {
    background-color: var(--sys-color-primary-container);
  }

  54%,
  100% {
    background-color: transparent;
  }
}

</style>
