<template>
  <section class="lane-card">
    <header class="lane-header">
      <h2 class="lane-title">{{ t("prPage.partnerSection.rosterTitle") }}</h2>
      <span class="lane-meta">
        {{
          t("prPage.partnerSection.rosterCount", {
            count: section.roster.length,
          })
        }}
      </span>
    </header>

    <p v-if="section.roster.length === 0" class="lane-empty">
      {{ t("prPage.partnerSection.rosterEmpty") }}
    </p>

    <div v-else class="roster-list">
      <article
        v-for="item in section.roster"
        :key="item.partnerId"
        class="roster-item"
      >
        <div class="roster-main">
          <span class="roster-name">{{ item.displayName }}</span>
          <div class="roster-tags">
            <span v-if="item.isSelf" class="roster-tag">
              {{ t("prPage.partnerSection.rosterSelf") }}
            </span>
            <span v-if="item.isCreator" class="roster-tag">
              {{ t("prPage.partnerSection.rosterCreator") }}
            </span>
          </div>
        </div>
        <span class="roster-state">{{ rosterStateText(item.state) }}</span>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { AnchorPRDetailResponse } from "@/domains/pr/queries/useAnchorPR";

type AnchorPartnerSection = AnchorPRDetailResponse["partnerSection"];

defineProps<{
  section: AnchorPartnerSection;
}>();

const { t } = useI18n();

const rosterStateText = (
  state: AnchorPartnerSection["roster"][number]["state"],
): string => {
  switch (state) {
    case "CONFIRMED":
      return t("prPage.partnerSection.rosterConfirmed");
    case "ATTENDED":
      return t("prPage.partnerSection.rosterAttended");
    default:
      return t("prPage.partnerSection.rosterJoined");
  }
};
</script>

<style lang="scss" scoped>
.lane-card {
  margin-top: var(--sys-spacing-lg);
  @include mx.pu-surface-card(section);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.lane-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sys-spacing-sm);
}

.lane-title {
  margin: 0;
  @include mx.pu-font(title-medium);
}

.lane-meta,
.lane-empty {
  margin: 0;
  @include mx.pu-font(body-medium);
  color: var(--sys-color-on-surface-variant);
}

.roster-list {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.roster-item {
  @include mx.pu-surface-card(outline);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sys-spacing-sm);
}

.roster-main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  min-width: 0;
}

.roster-name {
  @include mx.pu-font(body-large);
  overflow-wrap: anywhere;
}

.roster-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs);
}

.roster-tag,
.roster-state {
  @include mx.pu-font(label-small);
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--sys-color-secondary-container);
  color: var(--sys-color-on-secondary-container);
}

.roster-state {
  align-self: center;
}
</style>
