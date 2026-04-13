<template>
  <div v-if="activeDemandCard" class="card-mode" data-region="anchor-pr-list">
    <div class="card-stage">
      <div class="card-stage__edge-glow" aria-hidden="true">
        <span
          class="card-stage__edge-glow-side card-stage__edge-glow-side--left"
          :style="leftEdgeGlowStyle"
        />
        <span
          class="card-stage__edge-glow-side card-stage__edge-glow-side--right"
          :style="rightEdgeGlowStyle"
        />
      </div>

      <div class="card-stage__inner">
        <AnchorEventDemandCard
          v-for="(previewCard, previewIndex) in stackPreviewCards"
          :key="`preview-${previewCard.cardKey}`"
          class="card-stack-preview"
          :style="{
            zIndex: 2 - previewIndex,
            animationDelay: `${70 + previewIndex * 40}ms`,
          }"
          :display-location-name="previewCard.displayLocationName"
          :time-label="previewCard.timeLabel"
          :preference-tags="previewCard.preferenceTags"
          :notes="previewCard.notes"
          :cover-image="previewCard.coverImage"
          :detail-pr-id="previewCard.detailPrId"
          :preview="true"
          :preview-depth="previewIndex + 1"
          aria-hidden="true"
        />

        <div class="card-stage__front-shell" @pointerdown="emitUserInteraction">
          <AnchorEventDemandCard
            class="card-stage__front"
            :display-location-name="activeDemandCard.displayLocationName"
            :time-label="activeDemandCard.timeLabel"
            :preference-tags="activeDemandCard.preferenceTags"
            :notes="activeDemandCard.notes"
            :cover-image="activeDemandCard.coverImage"
            :detail-pr-id="activeDemandCard.detailPrId"
            :pending="isCardRouting"
            @swipe-preview="emitSwipePreview"
            @skip="emitSkipActiveCard"
            @view-detail="emitViewActiveCardDetail"
          />
        </div>

        <transition name="card-swipe-hint">
          <p
            v-if="showCardSwipeHintToast"
            class="card-mode__swipe-hint-toast"
            role="status"
            aria-live="polite"
          >
            {{ t("anchorEvent.card.swipeHintToast") }}
          </p>
        </transition>
      </div>
    </div>

    <div class="card-mode__actions">
      <button
        type="button"
        class="card-mode__action card-mode__action--skip"
        :disabled="isCardRouting"
        @click="emitSkipActiveCard"
      >
        {{ t("anchorEvent.card.skipButton") }}
      </button>
      <button
        type="button"
        class="card-mode__action card-mode__action--detail"
        :disabled="isCardRouting || activeDemandCard.detailPrId === null"
        @click="emitViewActiveCardDetail"
      >
        {{ t("anchorEvent.card.detailButton") }}
      </button>
    </div>

    <p v-if="cardActionError" class="card-mode__error">
      {{ cardActionError }}
    </p>
  </div>

  <div v-else class="card-empty-stack">
    <div class="card-empty">
      <p class="card-empty__title">
        {{ t("anchorEvent.card.emptyTitle") }}
      </p>
      <p class="card-empty__subtitle">
        {{ t("anchorEvent.card.emptySubtitle") }}
      </p>

      <div class="card-empty__create" data-region="create-anchor-pr">
        <label
          v-if="cardCreateBatchOptions.length > 0"
          class="card-empty__field"
        >
          <span class="card-empty__label">{{
            t("anchorEvent.card.batchLabel")
          }}</span>
          <select
            :value="cardCreateBatchId ?? ''"
            class="card-empty__input"
            @change="handleCardCreateBatchChange"
          >
            <option
              v-for="option in cardCreateBatchOptions"
              :key="option.batchId"
              :value="option.batchId"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <label
          v-if="cardCreateBatchOptions.length > 0"
          class="card-empty__field"
        >
          <span class="card-empty__label">{{
            t("anchorEvent.createCard.locationLabel")
          }}</span>
          <select
            :value="cardCreateLocationId"
            class="card-empty__input"
            @change="handleCardCreateLocationChange"
          >
            <option
              v-for="option in cardCreateLocationOptions"
              :key="option.locationId"
              :value="option.locationId"
              :disabled="option.disabled"
            >
              {{ option.label }}
            </option>
          </select>
        </label>

        <p v-if="createActionErrorMessage" class="card-empty__error">
          {{ createActionErrorMessage }}
        </p>

        <button
          type="button"
          class="card-empty__action"
          :disabled="isCreatePending"
          @click="emitCreateFromCardEmpty"
        >
          {{
            isCreatePending
              ? t("anchorEvent.createCard.creatingAction")
              : t("anchorEvent.createCard.createAction")
          }}
        </button>
      </div>

      <OtherAnchorEventsSection
        :current-event-id="eventId"
        variant="embedded"
        data-region="discover-other-events"
      />
    </div>

    <AnchorEventBetaGroupCard
      :event-id="eventId"
      :event-title="eventTitle"
      :qr-code-url="eventBetaGroupQrCode"
      :default-expanded="true"
      variant="card"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import AnchorEventDemandCard from "@/domains/event/ui/primitives/AnchorEventDemandCard.vue";
import AnchorEventBetaGroupCard from "@/domains/event/ui/primitives/AnchorEventBetaGroupCard.vue";
import OtherAnchorEventsSection from "@/domains/event/ui/sections/OtherAnchorEventsSection.vue";

type DemandCardViewModel = {
  cardKey: string;
  timeLabel: string;
  displayLocationName: string;
  preferenceTags: string[];
  notes: string | null;
  detailPrId: number | null;
  coverImage: string | null;
};

type CardBatchOption = {
  batchId: number;
  label: string;
};

type CardCreateLocationOption = {
  locationId: string;
  label: string;
  disabled: boolean;
};

defineProps<{
  activeDemandCard: DemandCardViewModel | null;
  stackPreviewCards: DemandCardViewModel[];
  isCardRouting: boolean;
  cardActionError: string | null;
  showCardSwipeHintToast: boolean;
  leftEdgeGlowStyle: Record<string, string | number>;
  rightEdgeGlowStyle: Record<string, string | number>;
  cardCreateBatchOptions: CardBatchOption[];
  cardCreateBatchId: number | null;
  cardCreateLocationId: string;
  cardCreateLocationOptions: CardCreateLocationOption[];
  createActionErrorMessage: string | null;
  isCreatePending: boolean;
  eventId: number;
  eventTitle: string;
  eventBetaGroupQrCode: string | null;
}>();

const emit = defineEmits<{
  "user-interaction": [];
  "swipe-preview": [intensity: number];
  "skip-active-card": [];
  "view-active-card-detail": [];
  "update:cardCreateBatchId": [value: number | null];
  "update:cardCreateLocationId": [value: string];
  "create-from-card-empty": [];
}>();

const { t } = useI18n();

const emitUserInteraction = () => {
  emit("user-interaction");
};

const emitSwipePreview = (intensity: number) => {
  emit("swipe-preview", intensity);
};

const emitSkipActiveCard = () => {
  emit("skip-active-card");
};

const emitViewActiveCardDetail = () => {
  emit("view-active-card-detail");
};

const emitCreateFromCardEmpty = () => {
  emit("create-from-card-empty");
};

const handleCardCreateBatchChange = (event: Event) => {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  const nextValue = Number(select.value);
  if (!Number.isFinite(nextValue)) {
    emit("update:cardCreateBatchId", null);
    return;
  }

  emit("update:cardCreateBatchId", nextValue);
};

const handleCardCreateLocationChange = (event: Event) => {
  const select = event.target;
  if (!(select instanceof HTMLSelectElement)) {
    return;
  }

  emit("update:cardCreateLocationId", select.value);
};
</script>

<style lang="scss" scoped>
.card-mode {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
  min-height: 0;
  margin-left: calc(-1 * (var(--sys-spacing-med) + var(--pu-safe-left)));
  margin-right: calc(-1 * (var(--sys-spacing-med) + var(--pu-safe-right)));
}

.card-stage {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  --card-stage-vertical-inset: 6%;
  padding-inline-start: calc(var(--sys-spacing-med) + var(--pu-safe-left));
  padding-inline-end: calc(var(--sys-spacing-med) + var(--pu-safe-right));
}

.card-stage__inner {
  position: relative;
  z-index: 2;
  flex: 1 1 auto;
  min-height: 0;
}

.card-stage__front-shell {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--card-stage-vertical-inset);
  bottom: var(--card-stage-vertical-inset);
  z-index: 3;
  animation: card-front-promote 220ms cubic-bezier(0.16, 1, 0.3, 1);
}

.card-stage__front {
  z-index: 2;
}

.card-stack-preview {
  position: absolute;
  left: 0;
  right: 0;
  top: var(--card-stage-vertical-inset);
  bottom: var(--card-stage-vertical-inset);
  pointer-events: none;
  animation: card-preview-reveal 220ms ease-out both;
}

.card-stage__edge-glow {
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(-1 * (var(--sys-spacing-med) + var(--pu-safe-left)));
  right: calc(-1 * (var(--sys-spacing-med) + var(--pu-safe-right)));
  z-index: 1;
  pointer-events: none;
}

.card-stage__edge-glow-side {
  position: absolute;
  top: var(--card-stage-vertical-inset);
  bottom: var(--card-stage-vertical-inset);
  inline-size: 26%;
  min-inline-size: 96px;
  max-inline-size: 220px;
  opacity: 0;
  border-radius: 999px;
  filter: blur(42px);
  will-change: opacity, transform;
  transition:
    opacity 120ms linear,
    transform 120ms ease-out;
}

.card-stage__edge-glow-side--left {
  left: 0;
  transform-origin: left center;
  background: linear-gradient(
    90deg,
    var(--sys-color-error) 0%,
    transparent 78%
  );
}

.card-stage__edge-glow-side--right {
  right: 0;
  transform-origin: right center;
  background: linear-gradient(
    270deg,
    var(--sys-color-primary) 0%,
    transparent 78%
  );
}

.card-mode__swipe-hint-toast {
  @include mx.pu-font(label-large);
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 4;
  transform: translate(-50%, -50%);
  margin: 0;
  padding: var(--sys-spacing-xs) var(--sys-spacing-med);
  border-radius: 999px;
  border: 1px solid var(--sys-color-outline-variant);
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface);
  box-shadow: var(--sys-shadow-2);
  backdrop-filter: blur(4px);
  pointer-events: none;
  white-space: nowrap;
}

.card-swipe-hint-enter-active,
.card-swipe-hint-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.card-swipe-hint-enter-from,
.card-swipe-hint-leave-to {
  opacity: 0;
  transform: translate(-50%, -46%);
}

@keyframes card-front-promote {
  from {
    transform: translateY(14px) scale(0.972);
  }
  to {
    transform: translateY(0) scale(1);
  }
}

@keyframes card-preview-reveal {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.card-mode__error {
  @include mx.pu-font(body-medium);
  margin: 0;
  color: var(--sys-color-error);
  padding-inline-start: calc(var(--sys-spacing-med) + var(--pu-safe-left));
  padding-inline-end: calc(var(--sys-spacing-med) + var(--pu-safe-right));
}

.card-mode__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-sm);
  padding-inline-start: calc(var(--sys-spacing-med) + var(--pu-safe-left));
  padding-inline-end: calc(var(--sys-spacing-med) + var(--pu-safe-right));
}

.card-mode__action {
  @include mx.pu-pill-action(outline-transparent, default);
  border: none;
  cursor: pointer;
  min-height: 48px;
}

.card-mode__action:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.card-mode__action--detail {
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
  border-color: var(--sys-color-primary);
}

.card-mode__action--skip {
  color: var(--sys-color-error);
  border-color: var(--sys-color-error);
}

.card-empty-stack {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.card-empty {
  padding: 1rem;
  border-radius: var(--sys-radius-lg);
  background: var(--sys-color-surface-container);
  border: 1px solid var(--sys-color-outline-variant);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.card-empty__title {
  @include mx.pu-font(title-medium);
  margin: 0;
  color: var(--sys-color-on-surface);
}

.card-empty__subtitle {
  @include mx.pu-font(body-small);
  margin: 0;
  color: var(--sys-color-on-surface-variant);
}

.card-empty__create {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.card-empty__field {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.card-empty__label {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
}

.card-empty__input {
  @include mx.pu-field-shell(compact-surface);
  min-height: var(--sys-size-large);
}

.card-empty__error {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}

.card-empty__action {
  @include mx.pu-pill-action(solid-primary, small);
  border: none;
  cursor: pointer;
}

.card-empty__action:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
