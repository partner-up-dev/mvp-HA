<template>
  <section class="form-mode-location-control">
    <div class="form-mode-location-control__header">
      <h2 class="form-mode-location-control__title">
        {{ t("anchorEvent.formMode.locationTitle") }}
      </h2>
    </div>

    <PeekRadioCarousel
      v-if="locationCards.length > 0"
      :model-value="props.modelValue"
      class="location-carousel"
      :items="locationCards"
      :aria-label="t('anchorEvent.formMode.locationAriaLabel')"
      @update:model-value="handleUpdateLocation"
    >
      <template #item="{ item, selected }">
        <article
          class="location-card"
          :class="{
            'location-card--selected': selected,
            'location-card--with-image': Boolean(
              asLocationCardViewModel(item).coverImage,
            ),
          }"
        >
          <img
            v-if="asLocationCardViewModel(item).coverImage"
            :src="asLocationCardViewModel(item).coverImage ?? undefined"
            :alt="String(asLocationCardViewModel(item).id)"
            class="location-card__image"
          />
          <div v-else class="location-card__fallback">
            <span>{{ asLocationCardViewModel(item).id }}</span>
          </div>
        </article>
      </template>
    </PeekRadioCarousel>

    <Transition name="location-label" mode="out-in">
      <div :key="props.modelValue ?? 'none'" class="location-caption">
        <p class="location-caption__name">
          {{ selectedLocationLabel }}
        </p>
      </div>
    </Transition>
  </section>
</template>

<script setup lang="ts">
import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import PeekRadioCarousel, {
  type PeekRadioCarouselItem,
} from "@/domains/event/ui/composites/PeekRadioCarousel.vue";
import type { AnchorEventFormModeResponse } from "@/domains/event/model/types";
import { pickStableGalleryImage } from "@/domains/event/model/form-mode";

type LocationEntry = AnchorEventFormModeResponse["locations"][number];

type LocationCardViewModel = LocationEntry &
  PeekRadioCarouselItem & {
    coverImage: string | null;
  };

const props = defineProps<{
  modelValue: string | null;
  locations: readonly LocationEntry[];
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string | null];
}>();

const { t } = useI18n();

const locationCards = computed<LocationCardViewModel[]>(() =>
  props.locations.map((location) => ({
    ...location,
    coverImage: pickStableGalleryImage(location.gallery, location.id),
  })),
);

const selectedLocationLabel = computed(() => {
  const selected = locationCards.value.find(
    (location) => location.id === props.modelValue,
  );
  return selected?.id ?? t("anchorEvent.formMode.locationPlaceholder");
});

const asLocationCardViewModel = (value: PeekRadioCarouselItem) =>
  value as LocationCardViewModel;

const handleUpdateLocation = (value: string | number | null) => {
  emit("update:modelValue", typeof value === "string" ? value : null);
};

watch(
  locationCards,
  (locations) => {
    if (
      props.modelValue &&
      locations.some((location) => location.id === props.modelValue)
    ) {
      return;
    }
    emit("update:modelValue", locations[0]?.id ?? null);
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.form-mode-location-control {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.form-mode-location-control__header {
  display: flex;
  flex-direction: column;
}

.form-mode-location-control__title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.location-card {
  position: relative;
  overflow: hidden;
  height: clamp(9rem, 24vh, 13rem);
  border-radius: var(--sys-radius-sm);
  background: linear-gradient(
    160deg,
    color-mix(in srgb, var(--sys-color-primary) 24%, white),
    var(--sys-color-surface-container-high)
  );
  transition:
    transform 220ms ease,
    box-shadow 220ms ease;
}

.location-card--selected {
  transform: translateY(-6px);
  @include mx.pu-elevation(3);
}

.location-card__image,
.location-card__fallback {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.location-card__image {
  display: block;
  object-fit: cover;
}

.location-card__fallback {
  display: flex;
  box-sizing: border-box;
  align-items: flex-end;
  justify-content: flex-start;
  padding: var(--sys-spacing-med);
  color: var(--sys-color-on-primary-container);
  @include mx.pu-font(title-medium);
}

.location-caption {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.location-caption__name {
  margin: 0;
  @include mx.pu-font(body-large);
}

.location-label-enter-active,
.location-label-leave-active {
  transition:
    opacity 180ms ease,
    transform 180ms ease;
}

.location-label-enter-from,
.location-label-leave-to {
  opacity: 0;
  transform: translateY(6px);
}
</style>
