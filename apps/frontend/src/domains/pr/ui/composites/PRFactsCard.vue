<template>
  <SurfaceCard
    v-bind="$attrs"
    as="section"
    class="pr-facts-card"
    gap="md"
  >
    <LoadingIndicator
      v-if="isLoading"
      :message="t('common.loading')"
    />
    <ErrorToast
      v-else-if="error"
      :message="error.message"
      persistent
    />

    <template v-else-if="prDetail">
      <h2 class="facts-title">活动信息</h2>

      <section class="facts-entry">
        <Button
          v-if="interactive && locationGalleryAvailable"
          class="facts-entry-button"
          tone="ghost"
          block
          @click="showLocationGalleryModal = true"
        >
          <span class="facts-entry-button__content">
            <span class="facts-entry-button__label">{{
              t("prCard.location")
            }}</span>
            <span class="facts-entry-button__trailing">
              <span class="facts-entry-button__action">
                {{ t("prCard.viewLocationImages") }}
              </span>
              <span
                class="facts-entry-button__icon i-mdi-chevron-right"
                aria-hidden="true"
              />
            </span>
          </span>
        </Button>

        <InfoRow v-else :label="t('prCard.location')">
          {{ prDetail.core.location ?? t("prPage.partnerSection.notSet") }}
        </InfoRow>

        <p v-if="interactive && locationGalleryAvailable" class="facts-entry__value">
          {{ prDetail.core.location ?? t("prPage.partnerSection.notSet") }}
        </p>
      </section>

      <section
        v-if="meetingPointDescription || meetingPointImageUrl"
        class="facts-entry"
      >
        <Button
          v-if="interactive && meetingPointImageUrl"
          class="facts-entry-button"
          tone="ghost"
          block
          @click="showMeetingPointGalleryModal = true"
        >
          <span class="facts-entry-button__content">
            <span class="facts-entry-button__label">{{
              t("prCard.meetingPoint")
            }}</span>
            <span class="facts-entry-button__trailing">
              <span class="facts-entry-button__action">
                {{ t("prCard.viewMeetingPointImage") }}
              </span>
              <span
                class="facts-entry-button__icon i-mdi-chevron-right"
                aria-hidden="true"
              />
            </span>
          </span>
        </Button>

        <InfoRow v-else :label="t('prCard.meetingPoint')">
          {{ meetingPointDescription ?? t("prPage.partnerSection.notSet") }}
        </InfoRow>

        <p
          v-if="interactive && meetingPointImageUrl && meetingPointDescription"
          class="facts-entry__value"
        >
          {{ meetingPointDescription }}
        </p>
      </section>

      <InfoRow :label="t('prCard.time')">
        {{ localizedTimeText }}
      </InfoRow>

      <InfoRow :label="t('prCard.preferences')" layout="stack" align="start">
        <ChipGroup>
          <Chip v-for="item in prDetail.core.preferences" :key="item">
            {{ item }}
          </Chip>
        </ChipGroup>
        <span v-if="prDetail.core.preferences.length === 0" class="facts-empty">
          {{ t("prPage.partnerSection.notSet") }}
        </span>
      </InfoRow>

      <section class="facts-entry">
        <Button
          v-if="interactive"
          class="facts-entry-button"
          tone="ghost"
          block
          @click="showRosterModal = true"
        >
          <span class="facts-entry-button__content">
            <span class="facts-entry-button__label">参与概览</span>
            <span class="facts-entry-button__trailing">
              <span
                class="facts-entry-button__icon i-mdi-chevron-right"
                aria-hidden="true"
              />
            </span>
          </span>
        </Button>

        <h3 v-else class="facts-entry__heading">参与概览</h3>

        <div class="facts-entry__stack">
          <p class="facts-overview">{{ participantOverviewText }}</p>

          <ChipGroup v-if="rosterPreview.length > 0">
            <template v-for="item in rosterPreview" :key="item.partnerId">
              <RouterLink
                v-if="interactive && isRosterLinkable(item.state)"
                :to="partnerProfilePath(item.partnerId)"
                class="roster-preview-link"
              >
                <Chip>{{ item.displayName }}</Chip>
              </RouterLink>

              <Chip v-else>
                {{ item.displayName }}
              </Chip>
            </template>

            <span v-if="hasMoreRoster" class="roster-chip-overflow"> ... </span>
          </ChipGroup>

          <span v-else class="facts-empty">
            {{ t("prPage.partnerSection.rosterCurrentEmpty") }}
          </span>
        </div>
      </section>

      <InfoRow
        v-if="normalizedNotes"
        :label="t('prCard.notes')"
        layout="stack"
        align="start"
      >
        <p class="facts-notes">{{ normalizedNotes }}</p>
      </InfoRow>
    </template>
  </SurfaceCard>

  <PRRosterModal
    v-if="interactive && prDetail"
    :open="showRosterModal"
    :pr-id="prDetail.id"
    :section="prDetail.partnerSection"
    @close="showRosterModal = false"
  />

  <PRLocationGalleryModal
    v-if="interactive"
    :open="showLocationGalleryModal"
    :images="locationGallery"
    @close="showLocationGalleryModal = false"
  />

  <PRLocationGalleryModal
    v-if="interactive"
    :open="showMeetingPointGalleryModal"
    :images="meetingPointImageUrl ? [meetingPointImageUrl] : []"
    :title="t('prCard.meetingPointImageTitle')"
    @close="showMeetingPointGalleryModal = false"
  />
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PRId } from "@partner-up-dev/backend";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import InfoRow from "@/shared/ui/display/InfoRow.vue";
import Chip from "@/shared/ui/display/Chip.vue";
import ChipGroup from "@/shared/ui/display/ChipGroup.vue";
import Button from "@/shared/ui/actions/Button.vue";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import PRLocationGalleryModal from "@/domains/pr/ui/modals/PRLocationGalleryModal.vue";
import PRRosterModal from "@/domains/pr/ui/modals/PRRosterModal.vue";
import type { PRPartnerSectionView } from "@/domains/pr/model/types";
import { prPartnerProfilePath } from "@/domains/pr/routing/routes";
import { usePRDetail } from "@/domains/pr/queries/usePRDetail";
import { usePRLocationGallery } from "@/domains/pr/use-cases/usePRLocationGallery";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

type RosterPreviewItem = PRPartnerSectionView["roster"][number];

defineOptions({
  inheritAttrs: false,
});

const props = withDefaults(
  defineProps<{
    prId: PRId;
    interactive?: boolean;
  }>(),
  {
    interactive: true,
  },
);

const emit = defineEmits<{
  ready: [];
}>();

const { t } = useI18n();

const prId = computed(() => props.prId);
const { data, isLoading, error } = usePRDetail(prId);
const prDetail = computed(() => data.value);
const showLocationGalleryModal = ref(false);
const showMeetingPointGalleryModal = ref(false);
const showRosterModal = ref(false);
const DAY_IN_MS = 24 * 60 * 60 * 1000;
const FACTS_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})\s(.+)$/;

const { locationId, locationGallery } = usePRLocationGallery(
  computed(() => prDetail.value?.core.location ?? null),
);

watch(locationId, () => {
  showLocationGalleryModal.value = false;
});

const locationGalleryAvailable = computed(() => locationGallery.value.length > 0);

const meetingPointDescription = computed(() => {
  const description = prDetail.value?.core.meetingPoint?.description?.trim() ?? "";
  return description.length > 0 ? description : null;
});

const meetingPointImageUrl = computed(() => {
  const imageUrl = prDetail.value?.core.meetingPoint?.imageUrl?.trim() ?? "";
  return imageUrl.length > 0 ? imageUrl : null;
});

const normalizedNotes = computed(() => {
  const trimmed = prDetail.value?.core.notes?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
});

const extractFactsTimeDatePart = (formatted: string | null): string | null => {
  if (!formatted) {
    return null;
  }

  const matched = formatted.match(FACTS_TIME_PATTERN);
  if (!matched) {
    return null;
  }

  return `${matched[1]}-${matched[2]}-${matched[3]}`;
};

const resolveRelativeDayLabelByDate = (
  year: number,
  month: number,
  day: number,
): "今天" | "明天" | "后天" | null => {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    return null;
  }

  const today = new Date();
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const targetStart = new Date(year, month - 1, day);
  if (Number.isNaN(targetStart.getTime())) {
    return null;
  }

  const diffDays = Math.round(
    (targetStart.getTime() - todayStart.getTime()) / DAY_IN_MS,
  );
  if (diffDays === 0) {
    return "今天";
  }

  if (diffDays === 1) {
    return "明天";
  }

  if (diffDays === 2) {
    return "后天";
  }

  return null;
};

const formatFactsTimePoint = (
  formatted: string | null,
  includeRelativeDayLabel: boolean,
): string | null => {
  if (!formatted || !includeRelativeDayLabel) {
    return formatted;
  }

  const matched = formatted.match(FACTS_TIME_PATTERN);
  if (!matched) {
    return formatted;
  }

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  const timePart = matched[4];
  const relativeDayLabel = resolveRelativeDayLabelByDate(year, month, day);
  if (!relativeDayLabel) {
    return formatted;
  }

  const datePart = `${matched[1]}-${matched[2]}-${matched[3]}`;
  return `${datePart} (${relativeDayLabel}) ${timePart}`;
};

const localizedTimeText = computed(() => {
  const [startRaw, endRaw] = prDetail.value?.core.time ?? [null, null];
  const startBase = formatLocalDateTimeValue(startRaw);
  const endBase = formatLocalDateTimeValue(endRaw);
  const sameDay =
    extractFactsTimeDatePart(startBase) !== null &&
    extractFactsTimeDatePart(startBase) === extractFactsTimeDatePart(endBase);
  const start = formatFactsTimePoint(startBase, true);
  const end = formatFactsTimePoint(endBase, !sameDay);

  if (start && end) return `${start} - ${end}`;
  return start ?? end ?? t("prPage.partnerSection.notSet");
});

const participantOverviewText = computed(() => {
  if (!prDetail.value) return "";
  const current = prDetail.value.partnerSection.capacity.current;
  const min = prDetail.value.partnerSection.capacity.min;
  if (min === null) return `${current} 人已加入，当前未设置最低成团人数。`;
  return `${current} 人已加入，最低成团人数 ${min} 人。`;
});

const isActiveRosterState = (state: RosterPreviewItem["state"]): boolean =>
  state === "JOINED" || state === "CONFIRMED" || state === "ATTENDED";

const activeRoster = computed(
  () =>
    prDetail.value?.partnerSection.roster.filter((item) =>
      isActiveRosterState(item.state),
    ) ?? [],
);
const rosterPreview = computed(() => activeRoster.value.slice(0, 4));
const hasMoreRoster = computed(
  () => activeRoster.value.length > rosterPreview.value.length,
);

const partnerProfilePath = (partnerId: number): string =>
  prPartnerProfilePath(props.prId, partnerId);

const isRosterLinkable = (state: RosterPreviewItem["state"]): boolean =>
  state !== "RELEASED" && state !== "EXITED";

watch(
  prDetail,
  async (value) => {
    if (!value) {
      return;
    }
    await nextTick();
    emit("ready");
  },
  { immediate: true },
);
</script>

<style scoped lang="scss">
.pr-facts-card {
  min-width: 0;
}

.facts-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.facts-entry {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
}

.facts-entry__heading {
  margin: 0;
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.facts-entry__value,
.facts-overview {
  margin: 0;
  @include mx.pu-font(body-medium);
  overflow-wrap: anywhere;
}

.facts-entry__stack {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xsmall);
  min-width: 0;
}

.facts-entry-button {
  padding: 0 !important;
  border: none;
  justify-content: flex-start;
}

.facts-entry-button:deep(.ui-button__content) {
  width: 100%;
}

.facts-entry-button__content {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: var(--sys-spacing-small);
  text-align: left;
}

.facts-entry-button__label {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.facts-entry-button__trailing {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xsmall);
  flex-shrink: 0;
}

.facts-entry-button__action {
  @include mx.pu-font(label-medium);
}

.facts-entry-button__icon {
  @include mx.pu-icon(smallall);
}

.facts-empty {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.facts-notes {
  margin: 0;
  @include mx.pu-font(body-medium);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.roster-preview-link {
  display: inline-flex;
  border-radius: 999px;
  text-decoration: none;

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.roster-chip-overflow {
  @include mx.pu-font(label-medium);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: var(--sys-size-medium);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}
</style>
