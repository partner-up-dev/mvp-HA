<template>
  <section class="anchor-event-form-mode">
    <LoadingIndicator
      v-if="formModeQuery.isLoading.value"
      :message="t('common.loading')"
    />

    <ErrorToast
      v-else-if="formModeQuery.error.value"
      :message="formModeQuery.error.value.message"
      persistent
    />

    <div v-else-if="formModeData" class="anchor-event-form-mode__stack">
      <section
        v-if="recommendationResult"
        class="anchor-event-form-mode__selection-summary"
      >
        <div class="selection-summary__content">
          <p class="selection-summary__eyebrow">
            {{ t("anchorEvent.formMode.recommendationSummaryEyebrow") }}
          </p>
          <h2 class="selection-summary__title">
            {{ primaryCtaLabel }}
          </h2>
          <div class="selection-summary__chips">
            <Chip tone="surface" size="sm">
              {{ selectedLocationLabel }}
            </Chip>
            <Chip tone="surface" size="sm">
              {{ selectedTimeLabel }}
            </Chip>
            <Chip
              v-for="preference in selectedPreferences"
              :key="preference"
              tone="outline"
              size="sm"
            >
              {{ preference }}
            </Chip>
          </div>
        </div>

        <Button
          appearance="pill"
          tone="outline"
          size="sm"
          type="button"
          @click="handleModifySelection"
        >
          {{ t("anchorEvent.formMode.modifyConditions") }}
        </Button>
      </section>

      <div v-if="!recommendationResult" class="form-mode-selection">
        <section class="form-block">
          <div class="form-block__header">
            <h2 class="form-block__title">
              {{ t("anchorEvent.formMode.locationTitle") }}
            </h2>
          </div>

          <PeekRadioCarousel
            v-if="locationCards.length > 0"
            v-model="selectedLocationId"
            class="location-carousel"
            :items="locationCards"
            :aria-label="t('anchorEvent.formMode.locationAriaLabel')"
          >
            <template #item="{ item, selected }">
              <!-- location cards are produced locally and cast back from the generic carousel slot -->
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
            <div :key="selectedLocationId ?? 'none'" class="location-caption">
              <p class="location-caption__name">
                {{ selectedLocationLabel }}
              </p>
            </div>
          </Transition>
        </section>

        <section class="form-block">
          <div class="form-block__header">
            <h2 class="form-block__title">
              {{ t("anchorEvent.formMode.timeTitle") }}
            </h2>
          </div>

          <div class="time-wheel">
            <div class="time-wheel__column">
              <div class="time-wheel__list" role="listbox" aria-label="M.D">
                <button
                  v-for="group in activeStartOptionGroups"
                  :key="group.dateKey"
                  class="time-wheel__option"
                  :class="{
                    'time-wheel__option--selected':
                      group.dateKey === selectedDateKey,
                  }"
                  type="button"
                  @click="selectedDateKey = group.dateKey"
                >
                  {{ group.dateLabel }}
                </button>
              </div>
            </div>

            <div class="time-wheel__column">
              <div class="time-wheel__list" role="listbox" aria-label="HH:mm">
                <button
                  v-for="option in activeTimeOptions"
                  :key="option.key"
                  class="time-wheel__option"
                  :class="{
                    'time-wheel__option--selected':
                      option.startAt === selectedStartAt,
                  }"
                  type="button"
                  @click="selectedStartAt = option.startAt"
                >
                  {{ formatFormModeTimeLabel(option.startAt) }}
                </button>
              </div>
            </div>
          </div>

          <div class="time-mode-row">
            <p class="time-mode-row__duration">
              {{ durationLabel }}
            </p>

            <button
              class="time-mode-toggle"
              :class="{ 'time-mode-toggle--active': advancedMode }"
              type="button"
              role="switch"
              :aria-checked="advancedMode"
              @click="advancedMode = !advancedMode"
            >
              <span class="time-mode-toggle__label">
                {{ t("anchorEvent.formMode.advancedModeLabel") }}
              </span>
              <span class="time-mode-toggle__track" aria-hidden="true">
                <span class="time-mode-toggle__thumb" />
              </span>
            </button>
          </div>
        </section>

        <section class="preference-block">
          <button
            class="preference-cell"
            type="button"
            @click="openPreferenceDrawer"
          >
            <div class="preference-cell__content">
              <span class="preference-cell__label">
                {{
                  selectedPreferences.length > 0
                    ? t("anchorEvent.formMode.preferenceSelectedCount", {
                        count: selectedPreferences.length,
                      })
                    : t("anchorEvent.formMode.preferencePlaceholder")
                }}
              </span>
            </div>
            <span
              class="preference-cell__icon i-mdi-chevron-right"
              aria-hidden="true"
            />
          </button>

          <p
            v-if="preferenceSubmissionMessage"
            class="inline-message inline-message--error"
          >
            {{ preferenceSubmissionMessage }}
          </p>
        </section>

        <p
          v-if="selectionErrorMessage"
          class="inline-message inline-message--error"
        >
          {{ selectionErrorMessage }}
        </p>

        <div class="form-actions">
          <Button
            appearance="rect"
            tone="outline"
            type="button"
            @click="handleViewAllSessions"
          >
            {{ t("anchorEvent.formMode.viewAllSessions") }}
          </Button>

          <Button
            appearance="rect"
            type="button"
            :disabled="!canSubmitRecommendation"
            :loading="recommendationMutation.isPending.value"
            @click="handleSubmitRecommendation"
          >
            {{ primaryCtaLabel }}
          </Button>
        </div>
      </div>

      <template v-else>
        <section
          v-if="recommendationResult.primaryRecommendation"
          class="recommendation-panel recommendation-panel--primary"
        >
          <div class="recommendation-panel__header">
            <p class="recommendation-panel__eyebrow">
              {{ t("anchorEvent.formMode.primaryRecommendationEyebrow") }}
            </p>
            <h2 class="recommendation-panel__title">
              {{
                buildCandidateHeadline(
                  recommendationResult.primaryRecommendation.pr.time[0],
                  recommendationResult.primaryRecommendation.pr.location,
                )
              }}
            </h2>
          </div>

          <p class="recommendation-panel__meta">
            {{
              buildCandidateMeta(
                recommendationResult.primaryRecommendation.pr.partnerCount,
                recommendationResult.primaryRecommendation.pr.maxPartners,
              )
            }}
          </p>

          <div class="recommendation-panel__chips">
            <Chip
              v-for="tag in recommendationResult.primaryRecommendation.match
                .exactTagMatches"
              :key="`match-${tag}`"
              tone="primary"
              size="sm"
            >
              {{ tag }}
            </Chip>
            <Chip
              v-for="tag in recommendationResult.primaryRecommendation.match
                .conflictingTagMatches"
              :key="`conflict-${tag}`"
              tone="warning"
              size="sm"
            >
              {{ tag }}
            </Chip>
          </div>

          <div class="recommendation-panel__actions">
            <FormModeLongPressButton
              :label="t('anchorEvent.formMode.joinPrimaryRecommendation')"
              :disabled="isRoutingToJoinDetail"
              :pending="isRoutingToJoinDetail"
              :pending-label="
                t('anchorEvent.formMode.openingPrimaryRecommendation')
              "
              @complete="handleJoinPrimaryRecommendation"
            />

            <Button
              appearance="rect"
              tone="outline"
              type="button"
              @click="
                handleOpenCandidateDetail(
                  recommendationResult.primaryRecommendation.pr.id,
                  'PRIMARY_DETAIL',
                )
              "
            >
              {{ t("anchorEvent.formMode.viewRecommendationDetail") }}
            </Button>
          </div>
        </section>

        <section
          v-else
          class="recommendation-panel recommendation-panel--empty"
        >
          <p class="recommendation-panel__eyebrow">
            {{ t("anchorEvent.formMode.emptyRecommendationEyebrow") }}
          </p>
          <h2 class="recommendation-panel__title">
            {{ t("anchorEvent.formMode.emptyRecommendationTitle") }}
          </h2>
          <p class="recommendation-panel__body">
            {{ t("anchorEvent.formMode.emptyRecommendationBody") }}
          </p>
        </section>

        <section
          v-if="recommendationResult.orderedCandidates.length > 0"
          class="recommendation-list"
        >
          <div class="form-block__header">
            <h2 class="form-block__title">
              {{ t("anchorEvent.formMode.candidateListTitle") }}
            </h2>
          </div>

          <article
            v-for="candidate in recommendationResult.orderedCandidates"
            :key="candidate.pr.id"
            class="candidate-card"
          >
            <div class="candidate-card__copy">
              <p class="candidate-card__title">
                {{
                  buildCandidateHeadline(
                    candidate.pr.time[0],
                    candidate.pr.location,
                  )
                }}
              </p>
              <p class="candidate-card__meta">
                {{
                  buildCandidateMeta(
                    candidate.pr.partnerCount,
                    candidate.pr.maxPartners,
                  )
                }}
              </p>
            </div>

            <Button
              appearance="rect"
              tone="outline"
              size="sm"
              type="button"
              @click="
                handleOpenCandidateDetail(
                  candidate.pr.id,
                  'CANDIDATE_DETAIL',
                  recommendationResult.orderedCandidates.findIndex(
                    (item) => item.pr.id === candidate.pr.id,
                  ) + 1,
                )
              "
            >
              {{ t("anchorEvent.formMode.viewRecommendationDetail") }}
            </Button>
          </article>
        </section>

        <div class="result-actions">
          <Button
            appearance="rect"
            tone="secondary"
            type="button"
            :loading="createMutation.isPending.value"
            @click="handleCreateFallback"
          >
            {{ t("anchorEvent.formMode.createFallbackAction") }}
          </Button>

          <Button
            appearance="rect"
            tone="outline"
            type="button"
            @click="handleViewAllSessions"
          >
            {{ t("anchorEvent.formMode.viewAllSessions") }}
          </Button>
        </div>

        <p
          v-if="createActionErrorMessage"
          class="inline-message inline-message--error"
        >
          {{ createActionErrorMessage }}
        </p>
      </template>
    </div>

    <BottomDrawer
      :open="preferenceDrawerOpen"
      :title="t('anchorEvent.formMode.preferenceDrawerTitle')"
      @close="closePreferenceDrawer"
    >
      <div class="preference-drawer">
        <section
          v-for="group in drawerTagGroups.categorized"
          :key="group.category"
          class="preference-group"
        >
          <h3 class="preference-group__title">{{ group.category }}</h3>
          <div class="preference-group__list">
            <button
              v-for="tag in group.tags"
              :key="tag.label"
              class="tag-pill"
              :class="{
                'tag-pill--selected':
                  drawerSelectedCategoryMap[group.category] === tag.label,
              }"
              type="button"
              @click="handleSelectDrawerCategoryTag(group.category, tag.label)"
            >
              <span class="tag-pill__label">{{ tag.label }}</span>
              <span v-if="tag.description" class="tag-pill__description">
                {{ tag.description }}
              </span>
            </button>
          </div>
        </section>

        <section
          v-if="drawerTagGroups.uncategorized.length > 0"
          class="preference-group"
        >
          <h3 class="preference-group__title">
            {{ drawerTagGroups.uncategorizedLabel }}
          </h3>
          <div class="preference-group__list">
            <button
              v-for="tag in drawerTagGroups.uncategorized"
              :key="tag.label"
              class="tag-pill"
              :class="{
                'tag-pill--selected':
                  drawerSelectedUncategorizedLabels.includes(tag.label),
              }"
              type="button"
              @click="handleToggleDrawerUncategorizedTag(tag.label)"
            >
              <span class="tag-pill__label">{{ tag.label }}</span>
              <span v-if="tag.description" class="tag-pill__description">
                {{ tag.description }}
              </span>
            </button>
          </div>
        </section>

        <section class="preference-group">
          <h3 class="preference-group__title">
            {{ t("anchorEvent.formMode.customTagTitle") }}
          </h3>
          <div class="custom-tag-row">
            <input
              v-model.trim="drawerCustomTagInput"
              class="custom-tag-row__input"
              :placeholder="t('anchorEvent.formMode.customTagPlaceholder')"
              type="text"
              maxlength="80"
              @keydown.enter.prevent="handleAddCustomTag"
            />
            <Button
              appearance="pill"
              tone="outline"
              size="sm"
              type="button"
              @click="handleAddCustomTag"
            >
              {{ t("anchorEvent.formMode.addCustomTagAction") }}
            </Button>
          </div>
          <p
            v-if="drawerCustomTagMessage"
            class="inline-message inline-message--error"
          >
            {{ drawerCustomTagMessage }}
          </p>
        </section>
      </div>

      <template #footer>
        <div class="drawer-actions">
          <Button
            appearance="pill"
            tone="outline"
            type="button"
            @click="closePreferenceDrawer"
          >
            {{ t("common.cancel") }}
          </Button>
          <Button
            appearance="pill"
            type="button"
            @click="handleSavePreferenceDrawer"
          >
            {{ t("common.confirm") }}
          </Button>
        </div>
      </template>
    </BottomDrawer>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type {
  AnchorEventFormModeRecommendationResponse,
  AnchorEventFormModeResponse,
} from "@/domains/event/model/types";
import Button from "@/shared/ui/actions/Button.vue";
import Chip from "@/shared/ui/display/Chip.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import BottomDrawer from "@/shared/ui/overlay/BottomDrawer.vue";
import { trackEvent } from "@/shared/telemetry/track";
import { useAnchorEventFormModeData } from "@/domains/event/queries/useAnchorEventFormModeData";
import { useAnchorEventPreferenceTagSubmissions } from "@/domains/event/queries/useAnchorEventPreferenceTagSubmissions";
import { useAnchorEventFormModeRecommendation } from "@/domains/event/queries/useAnchorEventFormModeRecommendation";
import {
  useCreateEventAssistedPR,
  type CreateEventAssistedPRError,
} from "@/domains/event/queries/useCreateEventAssistedPR";
import PeekRadioCarousel from "@/domains/event/ui/composites/PeekRadioCarousel.vue";
import FormModeLongPressButton from "@/domains/event/ui/primitives/FormModeLongPressButton.vue";
import {
  buildAdvancedModeStartOptions,
  buildPreferenceTagGroups,
  buildStartOptionsByDate,
  derivePreferenceCategory,
  formatFormModeDateLabel,
  formatFormModeDurationLabel,
  formatFormModeTimeLabel,
  pickStableGalleryImage,
} from "@/domains/event/model/form-mode";
import { prDetailPath } from "@/domains/pr/routing/routes";

type FormModePresetTag = {
  id: number;
  label: string;
  description: string;
};

type LocationCardViewModel =
  AnchorEventFormModeResponse["locations"][number] & {
    coverImage: string | null;
  };

type StartOption = AnchorEventFormModeResponse["startOptions"][number];

const props = defineProps<{
  eventId: number;
}>();

const router = useRouter();
const { t } = useI18n();

const eventId = computed(() => props.eventId);
const formModeQuery = useAnchorEventFormModeData(eventId);
const preferenceTagSubmissionMutation =
  useAnchorEventPreferenceTagSubmissions();
const recommendationMutation = useAnchorEventFormModeRecommendation();
const createMutation = useCreateEventAssistedPR();

const selectedLocationId = ref<string | null>(null);
const selectedDateKey = ref<string | null>(null);
const selectedStartAt = ref<string | null>(null);
const advancedMode = ref(false);
const selectedPreferences = ref<string[]>([]);
const localCustomTags = ref<FormModePresetTag[]>([]);
const preferenceDrawerOpen = ref(false);
const drawerSelectedCategoryMap = ref<Record<string, string | null>>({});
const drawerSelectedUncategorizedLabels = ref<string[]>([]);
const drawerCustomTags = ref<FormModePresetTag[]>([]);
const drawerCustomTagInput = ref("");
const drawerCustomTagMessage = ref<string | null>(null);
const preferenceSubmissionMessage = ref<string | null>(null);
const selectionErrorMessage = ref<string | null>(null);
const recommendationResult =
  ref<AnchorEventFormModeRecommendationResponse | null>(null);
const isRoutingToJoinDetail = ref(false);
const hasTrackedFormImpression = ref(false);

const formModeData = computed(() => formModeQuery.data.value ?? null);

const effectivePresetTags = computed<FormModePresetTag[]>(() => {
  const byLabel = new Map<string, FormModePresetTag>();
  for (const tag of formModeData.value?.presetTags ?? []) {
    byLabel.set(tag.label.trim().toLocaleLowerCase("zh-CN"), tag);
  }
  for (const tag of localCustomTags.value) {
    const key = tag.label.trim().toLocaleLowerCase("zh-CN");
    if (!byLabel.has(key)) {
      byLabel.set(key, tag);
    }
  }
  return Array.from(byLabel.values());
});

const drawerTagGroups = computed(() =>
  buildPreferenceTagGroups(
    effectivePresetTags.value as AnchorEventFormModeResponse["presetTags"],
  ),
);

const locationCards = computed(() =>
  (formModeData.value?.locations ?? []).map((location) => ({
    ...location,
    coverImage: pickStableGalleryImage(location.gallery, location.id),
  })),
);

const asLocationCardViewModel = (value: unknown): LocationCardViewModel =>
  value as LocationCardViewModel;

const defaultStartOptionGroups = computed(() =>
  buildStartOptionsByDate(formModeData.value?.startOptions ?? []),
);

const advancedStartOptionGroups = computed(() =>
  buildStartOptionsByDate(
    buildAdvancedModeStartOptions(
      formModeData.value?.event.earliestLeadMinutes ?? null,
    ),
  ),
);

const activeStartOptionGroups = computed(() =>
  advancedMode.value
    ? advancedStartOptionGroups.value
    : defaultStartOptionGroups.value,
);

const activeTimeOptions = computed<StartOption[]>(() => {
  const group = activeStartOptionGroups.value.find(
    (item) => item.dateKey === selectedDateKey.value,
  );
  return (group?.options ?? []) as StartOption[];
});

const durationLabel = computed(() =>
  formatFormModeDurationLabel(
    formModeData.value?.event.durationMinutes ?? null,
  ),
);

const selectedLocationLabel = computed(() => {
  const selected = locationCards.value.find(
    (location) => location.id === selectedLocationId.value,
  );
  return selected?.id ?? t("anchorEvent.formMode.locationPlaceholder");
});

const selectedTimeLabel = computed(() => {
  if (!selectedStartAt.value) {
    return t("anchorEvent.formMode.timePlaceholder");
  }
  return `${formatFormModeDateLabel(selectedStartAt.value)} ${formatFormModeTimeLabel(
    selectedStartAt.value,
  )}`;
});

const primaryCtaLabel = computed(() => {
  if (!selectedStartAt.value || !selectedLocationId.value) {
    return t("anchorEvent.formMode.primaryCtaFallback");
  }
  return t("anchorEvent.formMode.primaryCta", {
    time: selectedTimeLabel.value,
    location: selectedLocationLabel.value,
    eventTitle: formModeData.value?.event.title ?? "",
  });
});

const canSubmitRecommendation = computed(() =>
  Boolean(selectedLocationId.value && selectedStartAt.value),
);

const createActionErrorMessage = computed(() => {
  const error = createMutation.error.value as CreateEventAssistedPRError | null;
  if (!error) {
    return null;
  }

  switch (error.code) {
    case "ANCHOR_EVENT_NOT_FOUND":
      return t("anchorEvent.createCard.errors.eventUnavailable");
    case "WECHAT_AUTH_REQUIRED":
      return t("anchorEvent.createCard.errors.wechatAuthRequired");
    default:
      return t("anchorEvent.createCard.errors.createFailed");
  }
});

watch(
  locationCards,
  (locations) => {
    if (
      selectedLocationId.value &&
      locations.some((location) => location.id === selectedLocationId.value)
    ) {
      return;
    }
    selectedLocationId.value = locations[0]?.id ?? null;
  },
  { immediate: true },
);

watch(
  formModeData,
  (data) => {
    if (!data || hasTrackedFormImpression.value) {
      return;
    }

    trackEvent("anchor_event_form_impression", {
      eventId: props.eventId,
    });
    hasTrackedFormImpression.value = true;
  },
  { immediate: true },
);

watch(recommendationResult, (result) => {
  if (!result || !selectedLocationId.value || !selectedStartAt.value) {
    return;
  }

  trackEvent("anchor_event_form_recommendation_impression", {
    eventId: props.eventId,
    hasPrimaryRecommendation: Boolean(result.primaryRecommendation),
    candidateCount:
      result.orderedCandidates.length + (result.primaryRecommendation ? 1 : 0),
    advancedMode: advancedMode.value,
    locationId: selectedLocationId.value,
    startAt: selectedStartAt.value,
    preferenceCount: selectedPreferences.value.length,
  });
});

watch(
  activeStartOptionGroups,
  (groups) => {
    if (
      selectedDateKey.value &&
      groups.some((group) => group.dateKey === selectedDateKey.value)
    ) {
      return;
    }
    selectedDateKey.value = groups[0]?.dateKey ?? null;
  },
  { immediate: true },
);

watch(
  [activeTimeOptions, selectedDateKey],
  ([options]) => {
    if (
      selectedStartAt.value &&
      options.some((option) => option.startAt === selectedStartAt.value)
    ) {
      return;
    }
    selectedStartAt.value = options[0]?.startAt ?? null;
  },
  { immediate: true },
);

const openPreferenceDrawer = () => {
  drawerCustomTagMessage.value = null;
  const nextCategoryMap: Record<string, string | null> = {};
  const nextUncategorized: string[] = [];

  for (const preference of selectedPreferences.value) {
    const category = derivePreferenceCategory(preference);
    if (category) {
      nextCategoryMap[category] = preference;
      continue;
    }
    nextUncategorized.push(preference);
  }

  drawerSelectedCategoryMap.value = nextCategoryMap;
  drawerSelectedUncategorizedLabels.value = [...nextUncategorized];
  drawerCustomTags.value = [...localCustomTags.value];
  drawerCustomTagInput.value = "";
  preferenceDrawerOpen.value = true;
};

const closePreferenceDrawer = () => {
  preferenceDrawerOpen.value = false;
  drawerCustomTagInput.value = "";
  drawerCustomTagMessage.value = null;
};

const handleSelectDrawerCategoryTag = (category: string, label: string) => {
  drawerSelectedCategoryMap.value = {
    ...drawerSelectedCategoryMap.value,
    [category]:
      drawerSelectedCategoryMap.value[category] === label ? null : label,
  };
};

const handleToggleDrawerUncategorizedTag = (label: string) => {
  if (drawerSelectedUncategorizedLabels.value.includes(label)) {
    drawerSelectedUncategorizedLabels.value =
      drawerSelectedUncategorizedLabels.value.filter((item) => item !== label);
    return;
  }
  drawerSelectedUncategorizedLabels.value = [
    ...drawerSelectedUncategorizedLabels.value,
    label,
  ];
};

const handleAddCustomTag = () => {
  drawerCustomTagMessage.value = null;
  const normalized = drawerCustomTagInput.value.trim().replace(/\s+/g, " ");
  if (!normalized) {
    return;
  }

  const knownLabels = new Set(
    [...effectivePresetTags.value, ...drawerCustomTags.value].map((tag) =>
      tag.label.trim().toLocaleLowerCase("zh-CN"),
    ),
  );
  const key = normalized.toLocaleLowerCase("zh-CN");
  if (knownLabels.has(key)) {
    const category = derivePreferenceCategory(normalized);
    if (category) {
      drawerSelectedCategoryMap.value = {
        ...drawerSelectedCategoryMap.value,
        [category]: normalized,
      };
    } else if (!drawerSelectedUncategorizedLabels.value.includes(normalized)) {
      drawerSelectedUncategorizedLabels.value = [
        ...drawerSelectedUncategorizedLabels.value,
        normalized,
      ];
    }
    drawerCustomTagInput.value = "";
    return;
  }

  const tag = {
    id: -Date.now(),
    label: normalized,
    description: "",
  };
  drawerCustomTags.value = [...drawerCustomTags.value, tag];
  const category = derivePreferenceCategory(normalized);
  if (category) {
    drawerSelectedCategoryMap.value = {
      ...drawerSelectedCategoryMap.value,
      [category]: normalized,
    };
  } else {
    drawerSelectedUncategorizedLabels.value = [
      ...drawerSelectedUncategorizedLabels.value,
      normalized,
    ];
  }
  drawerCustomTagInput.value = "";
};

const handleSavePreferenceDrawer = async () => {
  const nextSelectedPreferences = [
    ...Object.values(drawerSelectedCategoryMap.value).filter(
      (value): value is string => Boolean(value),
    ),
    ...drawerSelectedUncategorizedLabels.value,
  ];

  const existingLocalKeys = new Set(
    localCustomTags.value.map((tag) =>
      tag.label.trim().toLocaleLowerCase("zh-CN"),
    ),
  );
  const newCustomLabels = drawerCustomTags.value
    .filter(
      (tag) =>
        !existingLocalKeys.has(tag.label.trim().toLocaleLowerCase("zh-CN")),
    )
    .map((tag) => tag.label);

  localCustomTags.value = [...drawerCustomTags.value];
  selectedPreferences.value = Array.from(new Set(nextSelectedPreferences));
  preferenceDrawerOpen.value = false;

  if (newCustomLabels.length > 0) {
    try {
      await preferenceTagSubmissionMutation.mutateAsync({
        eventId: props.eventId,
        labels: newCustomLabels,
      });
      preferenceSubmissionMessage.value = null;
    } catch {
      preferenceSubmissionMessage.value = t(
        "anchorEvent.formMode.customTagSubmitFailed",
      );
    }
  }
};

const handleViewAllSessions = async () => {
  await router.push({
    name: "anchor-event",
    params: {
      eventId: props.eventId.toString(),
    },
    query: {
      mode: "LIST",
    },
  });
};

const handleModifySelection = () => {
  recommendationResult.value = null;
  selectionErrorMessage.value = null;
};

const handleSubmitRecommendation = async () => {
  if (!selectedLocationId.value || !selectedStartAt.value) {
    return;
  }

  selectionErrorMessage.value = null;
  try {
    recommendationResult.value = await recommendationMutation.mutateAsync({
      eventId: props.eventId,
      locationId: selectedLocationId.value,
      startAt: selectedStartAt.value,
      preferences: [...selectedPreferences.value],
    });
  } catch (error) {
    selectionErrorMessage.value =
      error instanceof Error
        ? error.message
        : t("anchorEvent.formMode.recommendationFailed");
  }
};

const resolveSelectedTimeWindow = (): [string | null, string | null] => {
  if (!selectedStartAt.value) {
    return [null, null];
  }

  const fromDefaultOption = formModeData.value?.startOptions.find(
    (option) => option.startAt === selectedStartAt.value,
  );
  if (fromDefaultOption) {
    return [fromDefaultOption.startAt, fromDefaultOption.endAt];
  }

  const durationMinutes = formModeData.value?.event.durationMinutes ?? null;
  if (durationMinutes === null) {
    return [selectedStartAt.value, null];
  }

  const endAt = new Date(
    new Date(selectedStartAt.value).getTime() + durationMinutes * 60 * 1000,
  ).toISOString();
  return [selectedStartAt.value, endAt];
};

const buildCreateFields = (): PartnerRequestFields | null => {
  const timeWindow = resolveSelectedTimeWindow();
  if (
    !selectedLocationId.value ||
    !timeWindow[0] ||
    !timeWindow[1] ||
    !formModeData.value
  ) {
    return null;
  }

  return {
    title: undefined,
    type: formModeData.value.event.type,
    time: timeWindow,
    location: selectedLocationId.value,
    minPartners: formModeData.value.event.defaultMinPartners ?? 2,
    maxPartners: formModeData.value.event.defaultMaxPartners ?? null,
    partners: [],
    budget: null,
    preferences: [...selectedPreferences.value],
    notes: null,
  };
};

const handleCreateFallback = async () => {
  const fields = buildCreateFields();
  if (!fields || !selectedLocationId.value || !selectedStartAt.value) {
    return;
  }

  trackEvent("anchor_event_form_create_fallback_click", {
    eventId: props.eventId,
    locationId: selectedLocationId.value,
    startAt: selectedStartAt.value,
    preferenceCount: selectedPreferences.value.length,
  });

  const created = await createMutation.mutateAsync({
    eventId: props.eventId,
    fields,
  });

  await router.push(
    `${created.canonicalPath}?entry=create&fromEvent=${props.eventId}`,
  );
};

const handleOpenCandidateDetail = async (
  prId: number,
  action: "PRIMARY_DETAIL" | "CANDIDATE_DETAIL",
  candidateRank: number | null = null,
) => {
  trackEvent("anchor_event_form_result_action_click", {
    eventId: props.eventId,
    action,
    prId,
    candidateRank,
  });
  await router.push(`${prDetailPath(prId)}?fromEvent=${props.eventId}`);
};

const handleJoinPrimaryRecommendation = async () => {
  const prId = recommendationResult.value?.primaryRecommendation?.pr.id ?? null;
  if (prId === null || isRoutingToJoinDetail.value) {
    return;
  }

  isRoutingToJoinDetail.value = true;
  trackEvent("anchor_event_form_join_longpress_complete", {
    eventId: props.eventId,
    prId,
  });
  window.setTimeout(async () => {
    try {
      await router.push(
        `${prDetailPath(prId)}?fromEvent=${props.eventId}&entry=landing_join`,
      );
    } finally {
      isRoutingToJoinDetail.value = false;
    }
  }, 120);
};

const buildCandidateHeadline = (
  startAt: string | null,
  location: string | null,
) => {
  const timeLabel = startAt
    ? `${formatFormModeDateLabel(startAt)} ${formatFormModeTimeLabel(startAt)}`
    : t("anchorEvent.formMode.timePlaceholder");
  const locationLabel =
    location?.trim() || t("anchorEvent.formMode.locationPlaceholder");
  return t("anchorEvent.formMode.recommendationCardHeadline", {
    time: timeLabel,
    location: locationLabel,
  });
};

const buildCandidateMeta = (
  partnerCount: number,
  maxPartners: number | null,
) => {
  if (maxPartners !== null) {
    return t("anchorEvent.formMode.partnerCountWithMax", {
      current: partnerCount,
      max: maxPartners,
    });
  }
  return t("anchorEvent.formMode.partnerCountWithoutMax", {
    current: partnerCount,
  });
};
</script>

<style lang="scss" scoped>
.anchor-event-form-mode,
.anchor-event-form-mode__stack,
.form-mode-selection,
.form-block,
.preference-block,
.preference-cell,
.selection-summary__content,
.recommendation-panel,
.recommendation-list,
.preference-drawer,
.preference-group,
.candidate-card {
  display: flex;
  flex-direction: column;
}

.anchor-event-form-mode {
  flex: 1 1 auto;
  min-height: 0;
  padding-bottom: var(--sys-spacing-lg);
}

.anchor-event-form-mode__stack {
  flex: 1 1 auto;
  min-height: 0;
  gap: var(--sys-spacing-med);
}

.form-mode-selection {
  flex: 1 1 auto;
  min-height: 0;
  justify-content: space-between;
  gap: var(--sys-spacing-med);
}

.anchor-event-form-mode__selection-summary,
.recommendation-panel,
.recommendation-list {
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-med);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-lg);
  background: var(--sys-color-surface-container);
}

.form-block {
  gap: var(--sys-spacing-sm);
}

.preference-block {
  gap: var(--sys-spacing-xs);
}

.form-block__header,
.recommendation-panel__header {
  display: flex;
  flex-direction: column;
}

.selection-summary__eyebrow,
.recommendation-panel__eyebrow {
  margin: 0;
  color: var(--sys-color-primary);
  @include mx.pu-font(label-large);
}

.form-block__title,
.selection-summary__title,
.recommendation-panel__title {
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

.location-caption__name,
.time-mode-row__duration,
.recommendation-panel__meta,
.recommendation-panel__body,
.candidate-card__title,
.candidate-card__meta,
.inline-message {
  margin: 0;
}

.location-caption__name {
  @include mx.pu-font(body-large);
}

.time-mode-row__duration,
.recommendation-panel__meta,
.recommendation-panel__body,
.candidate-card__meta {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body-medium);
}

.time-wheel {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--sys-spacing-xs);
}

.time-wheel__column {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.time-wheel__list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  height: clamp(7rem, 18vh, 9.5rem);
  padding: var(--sys-spacing-xs) 0;
  overflow-y: auto;
  scrollbar-width: none;
}

.time-wheel__list::-webkit-scrollbar {
  display: none;
}

.time-wheel__option {
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  color: var(--sys-color-on-surface-variant);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  cursor: pointer;
  text-align: center;
  transition:
    background-color 180ms ease,
    color 180ms ease,
    transform 180ms ease;
  @include mx.pu-font(title-small);
}

.time-wheel__option--selected {
  background: var(--sys-color-surface-container-high);
  color: var(--sys-color-on-surface);
  transform: translateY(-2px);
}

.time-mode-row,
.form-actions,
.selection-summary__chips,
.recommendation-panel__chips,
.recommendation-panel__actions,
.result-actions,
.drawer-actions {
  display: flex;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.time-mode-row {
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  color: var(--sys-color-on-surface-variant);
}

.time-mode-toggle {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  padding: 0;
}

.time-mode-toggle__label {
  @include mx.pu-font(label-large);
}

.time-mode-toggle__track {
  position: relative;
  width: 3rem;
  height: 1.75rem;
  border-radius: 999px;
  background: var(--sys-color-surface-container-highest);
  transition: background-color 180ms ease;
}

.time-mode-toggle__thumb {
  position: absolute;
  top: 0.2rem;
  left: 0.2rem;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  background: var(--sys-color-on-surface-variant);
  transition:
    transform 180ms ease,
    background-color 180ms ease;
}

.time-mode-toggle--active .time-mode-toggle__track {
  background: var(--sys-color-primary-container);
}

.time-mode-toggle--active .time-mode-toggle__thumb {
  transform: translateX(1.2rem);
  background: var(--sys-color-primary);
}

.preference-cell {
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
  width: 100%;
  padding: var(--sys-spacing-sm) 0;
  border: none;
  border-top: 1px solid var(--sys-color-outline-variant);
  border-bottom: 1px solid var(--sys-color-outline-variant);
  border-radius: 0;
  background: transparent;
  color: var(--sys-color-on-surface);
  text-align: left;
  cursor: pointer;
}

.preference-cell__content,
.candidate-card__copy {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
}

.preference-cell__content {
  min-width: 0;
}

.preference-cell__label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  @include mx.pu-font(body-large);
}

.preference-cell__icon {
  flex-shrink: 0;
  @include mx.pu-icon(md);
}

.form-actions > :deep(button),
.recommendation-panel__actions > :deep(button),
.result-actions > :deep(button),
.drawer-actions > :deep(button) {
  flex: 1 1 14rem;
}

.form-actions > :deep(button),
.recommendation-panel__actions > :deep(button),
.result-actions > :deep(button) {
  border-radius: 0;
}

.form-actions {
  margin-top: auto;
  padding-top: var(--sys-spacing-sm);
}

.selection-summary__chips,
.recommendation-panel__chips {
  margin-top: var(--sys-spacing-xs);
}

.recommendation-list {
  gap: var(--sys-spacing-med);
}

.candidate-card {
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-sm);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface);
}

.candidate-card__title {
  @include mx.pu-font(title-small);
}

.preference-drawer {
  gap: var(--sys-spacing-med);
}

.preference-group {
  gap: var(--sys-spacing-sm);
}

.preference-group__title {
  margin: 0;
  @include mx.pu-font(title-small);
}

.preference-group__list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-sm);
}

.tag-pill {
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding: var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 180ms ease,
    background-color 180ms ease,
    transform 180ms ease;
}

.tag-pill--selected {
  border-color: var(--sys-color-primary);
  background: color-mix(
    in srgb,
    var(--sys-color-primary-container) 72%,
    var(--sys-color-surface)
  );
  transform: translateY(-2px);
}

.tag-pill__label {
  @include mx.pu-font(label-large);
}

.tag-pill__description {
  color: var(--sys-color-on-surface-variant);
  @include mx.pu-font(body-small);
}

.custom-tag-row {
  display: flex;
  gap: var(--sys-spacing-sm);
  flex-wrap: wrap;
}

.custom-tag-row__input {
  flex: 1 1 14rem;
  min-height: 2.75rem;
  padding: 0 var(--sys-spacing-sm);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-med);
  background: var(--sys-color-surface);
  color: var(--sys-color-on-surface);
  @include mx.pu-font(body-medium);
}

.inline-message {
  @include mx.pu-font(body-small);
}

.inline-message--error {
  color: var(--sys-color-error);
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

@media (max-width: 720px) {
  .time-mode-row {
    gap: var(--sys-spacing-xs);
  }
}
</style>
