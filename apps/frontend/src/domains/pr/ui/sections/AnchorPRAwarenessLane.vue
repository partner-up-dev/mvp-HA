<template>
  <section class="awareness-lane">
    <header class="lane-header">
      <h2 class="lane-title">
        {{ t("prPage.partnerSection.rosterBoardTitle") }}
      </h2>
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

    <template v-else>
      <section class="roster-group">
        <header class="roster-group__header">
          <h3 class="roster-group__title">
            {{ t("prPage.partnerSection.rosterTitle") }}
          </h3>
          <span class="roster-group__count">
            {{
              t("prPage.partnerSection.rosterCount", {
                count: activeRoster.length,
              })
            }}
          </span>
        </header>

        <p v-if="activeRoster.length === 0" class="lane-empty">
          {{ t("prPage.partnerSection.rosterCurrentEmpty") }}
        </p>

        <div v-else class="roster-list">
          <template v-for="item in activeRoster" :key="item.partnerId">
            <router-link
              v-if="isRosterLinkable(item.state)"
              :to="partnerProfilePath(item.partnerId)"
              class="roster-item roster-link"
            >
              <div class="roster-main">
                <div class="roster-identity">
                  <img
                    v-if="item.avatarUrl"
                    :src="item.avatarUrl"
                    :alt="rosterAvatarAlt(item.displayName)"
                    class="roster-avatar"
                  />
                  <div
                    v-else
                    class="roster-avatar roster-avatar--fallback"
                    aria-hidden="true"
                  >
                    <span>{{ rosterAvatarFallback(item.displayName) }}</span>
                  </div>
                  <span class="roster-name">{{ item.displayName }}</span>
                </div>
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
            </router-link>
            <div v-else class="roster-item">
              <div class="roster-main">
                <div class="roster-identity">
                  <img
                    v-if="item.avatarUrl"
                    :src="item.avatarUrl"
                    :alt="rosterAvatarAlt(item.displayName)"
                    class="roster-avatar"
                  />
                  <div
                    v-else
                    class="roster-avatar roster-avatar--fallback"
                    aria-hidden="true"
                  >
                    <span>{{ rosterAvatarFallback(item.displayName) }}</span>
                  </div>
                  <span class="roster-name">{{ item.displayName }}</span>
                </div>
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
            </div>
          </template>
        </div>
      </section>

      <details v-if="historyRoster.length > 0" class="roster-history">
        <summary class="roster-history__summary">
          <span>{{ t("prPage.partnerSection.rosterHistoryTitle") }}</span>
          <span class="roster-history__count">
            {{
              t("prPage.partnerSection.rosterCount", {
                count: historyRoster.length,
              })
            }}
          </span>
        </summary>

        <div class="roster-list roster-list--history">
          <template v-for="item in historyRoster" :key="item.partnerId">
            <router-link
              v-if="isRosterLinkable(item.state)"
              :to="partnerProfilePath(item.partnerId)"
              class="roster-item roster-link"
            >
              <div class="roster-main">
                <div class="roster-identity">
                  <img
                    v-if="item.avatarUrl"
                    :src="item.avatarUrl"
                    :alt="rosterAvatarAlt(item.displayName)"
                    class="roster-avatar"
                  />
                  <div
                    v-else
                    class="roster-avatar roster-avatar--fallback"
                    aria-hidden="true"
                  >
                    <span>{{ rosterAvatarFallback(item.displayName) }}</span>
                  </div>
                  <span class="roster-name">{{ item.displayName }}</span>
                </div>
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
            </router-link>
            <div v-else class="roster-item">
              <div class="roster-main">
                <div class="roster-identity">
                  <img
                    v-if="item.avatarUrl"
                    :src="item.avatarUrl"
                    :alt="rosterAvatarAlt(item.displayName)"
                    class="roster-avatar"
                  />
                  <div
                    v-else
                    class="roster-avatar roster-avatar--fallback"
                    aria-hidden="true"
                  >
                    <span>{{ rosterAvatarFallback(item.displayName) }}</span>
                  </div>
                  <span class="roster-name">{{ item.displayName }}</span>
                </div>
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
            </div>
          </template>
        </div>
      </details>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import type { AnchorPRDetailResponse } from "@/domains/pr/queries/useAnchorPR";
import { anchorPRPartnerProfilePath } from "@/domains/pr/routing/routes";

type AnchorPartnerSection = AnchorPRDetailResponse["partnerSection"];

const props = defineProps<{
  prId: number;
  section: AnchorPartnerSection;
}>();

const { t } = useI18n();
type RosterItem = AnchorPartnerSection["roster"][number];

const rosterStateText = (
  state: RosterItem["state"],
): string => {
  switch (state) {
    case "CONFIRMED":
      return t("prPage.partnerSection.rosterConfirmed");
    case "ATTENDED":
      return t("prPage.partnerSection.rosterAttended");
    case "EXITED":
      return t("prPage.partnerSection.rosterExited");
    case "RELEASED":
      return t("prPage.partnerSection.rosterReleased");
    default:
      return t("prPage.partnerSection.rosterJoined");
  }
};

const isRosterLinkable = (
  state: RosterItem["state"],
): boolean => state !== "RELEASED" && state !== "EXITED";
const isActiveRosterState = (state: RosterItem["state"]): boolean =>
  state === "JOINED" || state === "CONFIRMED" || state === "ATTENDED";
const activeRoster = computed(() =>
  props.section.roster.filter((item) => isActiveRosterState(item.state)),
);
const historyRoster = computed(() =>
  props.section.roster.filter((item) => !isActiveRosterState(item.state)),
);

const partnerProfilePath = (partnerId: number): string =>
  anchorPRPartnerProfilePath(props.prId, partnerId);

const rosterAvatarAlt = (name: string): string =>
  t("prPage.partnerSection.rosterAvatarAlt", { name });

const rosterAvatarFallback = (displayName: string): string => {
  const normalized = displayName.trim();
  if (normalized.length > 0) return normalized.slice(0, 1).toUpperCase();
  return t("prPage.partnerSection.rosterAvatarFallback");
};
</script>

<style lang="scss" scoped>
.awareness-lane {
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
}

.roster-list > * + * {
  border-top: 1px solid var(--sys-color-outline-variant);
}

.roster-list--history {
  margin-top: var(--sys-spacing-sm);
}

.roster-group {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.roster-group__header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--sys-spacing-sm);
}

.roster-group__title,
.roster-group__count {
  margin: 0;
}

.roster-group__title {
  @include mx.pu-font(title-small);
}

.roster-group__count {
  @include mx.pu-font(body-small);
  color: var(--sys-color-on-surface-variant);
}

.roster-history {
  padding-top: var(--sys-spacing-sm);
  border-top: 1px solid var(--sys-color-outline-variant);
}

.roster-history__summary {
  list-style: none;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: pointer;
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}

.roster-history__summary::-webkit-details-marker {
  display: none;
}

.roster-history__count {
  @include mx.pu-font(body-small);
}

.roster-item {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sys-spacing-sm);
  padding: var(--sys-spacing-sm) 0;
}

.roster-main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  min-width: 0;
}

.roster-identity {
  display: flex;
  align-items: center;
  gap: var(--sys-spacing-sm);
  min-width: 0;
}

.roster-name {
  @include mx.pu-font(body-large);
  overflow-wrap: anywhere;
}

.roster-link {
  text-decoration: none;
  color: inherit;
  transition: background-color 160ms ease;

  &:hover {
    background: var(--sys-color-surface-container-low);
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
  }
}

.roster-avatar {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 999px;
  object-fit: cover;
  flex-shrink: 0;
}

.roster-avatar--fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--sys-color-outline-variant);
  background: var(--sys-color-primary-container);
  color: var(--sys-color-on-primary-container);

  span {
    @include mx.pu-font(label-large);
  }
}

.roster-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--sys-spacing-xs);
}

.roster-tag,
.roster-state {
  @include mx.pu-font(label-small);
  color: var(--sys-color-on-surface-variant);
}

.roster-state {
  align-self: center;
}
</style>
