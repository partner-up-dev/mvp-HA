<template>
  <SurfaceCard as="section" class="anchor-pr-facts-card" gap="md">
    <h2 class="facts-title">活动信息</h2>

    <InfoRow :label="t('prCard.location')">
      {{ location ?? t("prPage.partnerSection.notSet") }}
    </InfoRow>

    <button
      v-if="locationGalleryAvailable"
      class="location-gallery-link"
      type="button"
      @click="$emit('view-location-gallery')"
    >
      {{ t("prCard.viewLocationImages") }}
    </button>

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

    <InfoRow label="参与概览" layout="stack" align="start">
      <p class="facts-overview">{{ participantOverviewText }}</p>
      <ChipGroup v-if="rosterPreview.length > 0">
        <Chip v-for="item in rosterPreview" :key="item.partnerId">
          {{ item.displayName }}
        </Chip>
        <span v-if="hasMoreRoster" class="roster-chip-overflow"> ... </span>
      </ChipGroup>
      <span v-else class="facts-empty">
        {{ t("prPage.partnerSection.rosterCurrentEmpty") }}
      </span>
    </InfoRow>
  </SurfaceCard>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import SurfaceCard from "@/shared/ui/containers/SurfaceCard.vue";
import InfoRow from "@/shared/ui/display/InfoRow.vue";
import Chip from "@/shared/ui/display/Chip.vue";
import ChipGroup from "@/shared/ui/display/ChipGroup.vue";
import type { AnchorPRDetailResponse } from "@/domains/pr/queries/useAnchorPR";

type RosterPreviewItem = AnchorPRDetailResponse["partnerSection"]["roster"][number];

defineProps<{
  location: string | null;
  timeText: string;
  preferences: string[];
  participantOverviewText: string;
  rosterPreview: readonly RosterPreviewItem[];
  hasMoreRoster: boolean;
  locationGalleryAvailable?: boolean;
}>();

defineEmits<{
  "view-location-gallery": [];
}>();

const { t } = useI18n();
</script>

<style scoped lang="scss">
.anchor-pr-facts-card {
  min-width: 0;
}

.facts-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.facts-empty {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.facts-overview {
  margin: 0;
  @include mx.pu-font(body-medium);
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

.location-gallery-link {
  @include mx.pu-font(label-medium);
  border: none;
  padding: 0;
  color: var(--sys-color-primary);
  background: transparent;
  width: fit-content;
  cursor: pointer;
  text-decoration: underline;
}
</style>
