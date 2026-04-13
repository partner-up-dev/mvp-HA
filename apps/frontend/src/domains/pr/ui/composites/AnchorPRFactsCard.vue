<template>
  <SurfaceCard as="section" class="anchor-pr-facts-card" gap="md">
    <h2 class="facts-title">活动信息</h2>

    <section class="facts-entry">
      <Button
        v-if="locationGalleryAvailable"
        class="facts-entry-button"
        tone="ghost"
        block
        @click="$emit('view-location-gallery')"
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
        {{ location ?? t("prPage.partnerSection.notSet") }}
      </InfoRow>

      <p v-if="locationGalleryAvailable" class="facts-entry__value">
        {{ location ?? t("prPage.partnerSection.notSet") }}
      </p>
    </section>

    <InfoRow :label="t('prCard.time')">
      {{ timeText }}
    </InfoRow>

    <InfoRow :label="t('prCard.preferences')" layout="stack" align="start">
      <ChipGroup>
        <Chip v-for="item in preferences" :key="item">
          {{ item }}
        </Chip>
      </ChipGroup>
      <span v-if="preferences.length === 0" class="facts-empty">
        {{ t("prPage.partnerSection.notSet") }}
      </span>
    </InfoRow>

    <section class="facts-entry">
      <Button
        class="facts-entry-button"
        tone="ghost"
        block
        @click="$emit('view-roster')"
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

      <div class="facts-entry__stack">
        <p class="facts-overview">{{ participantOverviewText }}</p>

        <ChipGroup v-if="rosterPreview.length > 0">
          <template v-for="item in rosterPreview" :key="item.partnerId">
            <RouterLink
              v-if="isRosterLinkable(item.state)"
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
  </SurfaceCard>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { useI18n } from "vue-i18n";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import InfoRow from "@/shared/ui/display/InfoRow.vue";
import Chip from "@/shared/ui/display/Chip.vue";
import ChipGroup from "@/shared/ui/display/ChipGroup.vue";
import Button from "@/shared/ui/actions/Button.vue";
import type { AnchorPRDetailResponse } from "@/domains/pr/queries/useAnchorPR";
import { anchorPRPartnerProfilePath } from "@/domains/pr/routing/routes";

type RosterPreviewItem =
  AnchorPRDetailResponse["partnerSection"]["roster"][number];

defineEmits<{
  "view-location-gallery": [];
  "view-roster": [];
}>();

const { t } = useI18n();

const props = defineProps<{
  prId: number;
  notes: string | null;
  location: string | null;
  timeText: string;
  preferences: string[];
  participantOverviewText: string;
  rosterPreview: readonly RosterPreviewItem[];
  hasMoreRoster: boolean;
  locationGalleryAvailable?: boolean;
}>();

const normalizedNotes = computed(() => {
  const trimmed = props.notes?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : null;
});

const partnerProfilePath = (partnerId: number): string =>
  anchorPRPartnerProfilePath(props.prId, partnerId);

const isRosterLinkable = (state: RosterPreviewItem["state"]): boolean =>
  state !== "RELEASED" && state !== "EXITED";
</script>

<style scoped lang="scss">
.anchor-pr-facts-card {
  min-width: 0;
}

.facts-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.facts-entry {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  min-width: 0;
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
  gap: var(--sys-spacing-xs);
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
  gap: var(--sys-spacing-sm);
  text-align: left;
}

.facts-entry-button__label {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.facts-entry-button__trailing {
  display: inline-flex;
  align-items: center;
  gap: var(--sys-spacing-xs);
  flex-shrink: 0;
}

.facts-entry-button__action {
  @include mx.pu-font(label-medium);
}

.facts-entry-button__icon {
  @include mx.pu-icon(small);
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
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}
</style>
