<template>
  <PageScaffoldFlow class="my-prs-page">
    <template #header>
      <PageHeader
        :title="t('myPrsPage.title')"
        :subtitle="t('myPrsPage.description')"
      />
    </template>

    <div class="page-main">
      <p v-if="!userSessionStore.isAuthenticated" class="auth-hint">
        {{ t("myPrsPage.authHint") }}
      </p>

      <section class="list-section">
        <div class="section-header">
          <h2>{{ t("myPrsPage.createdTitle") }}</h2>
          <span class="count">{{ createdItems.length }}</span>
        </div>

        <LoadingIndicator
          v-if="createdQuery.isLoading.value"
          :message="t('myPrsPage.loading')"
        />
        <p v-else-if="createdQuery.error.value" class="error-text">
          {{ createdErrorMessage }}
        </p>
        <p v-else-if="createdItems.length === 0" class="empty-text">
          {{ t("myPrsPage.createdEmpty") }}
        </p>
        <ul v-else class="list">
          <li v-for="item in createdItems" :key="`created-${item.id}`">
            <button class="list-item" type="button" @click="goToPR(item)">
              <div class="item-top">
                <div class="item-text">
                  <div class="item-name">{{ item.title || item.type }}</div>
                  <time class="item-time">{{
                    formatDate(item.createdAt)
                  }}</time>
                </div>
                <PRStatusBadge :status="item.status" />
              </div>
            </button>
          </li>
        </ul>
      </section>

      <section class="list-section">
        <div class="section-header">
          <h2>{{ t("myPrsPage.joinedTitle") }}</h2>
          <span class="count">{{ joinedDisplayItems.length }}</span>
        </div>

        <LoadingIndicator
          v-if="joinedQuery.isLoading.value"
          :message="t('myPrsPage.loading')"
        />
        <p v-else-if="joinedQuery.error.value" class="error-text">
          {{ joinedErrorMessage }}
        </p>
        <p v-else-if="joinedDisplayItems.length === 0" class="empty-text">
          {{ t("myPrsPage.joinedEmpty") }}
        </p>
        <ul v-else class="list">
          <li v-for="item in joinedDisplayItems" :key="`joined-${item.id}`">
            <button class="list-item" type="button" @click="goToPR(item)">
              <div class="item-top">
                <div class="item-text">
                  <div class="item-name">{{ item.title || item.type }}</div>
                  <time class="item-time">{{
                    formatDate(item.createdAt)
                  }}</time>
                </div>
                <PRStatusBadge :status="item.status" />
              </div>
            </button>
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <ContactSupportFooter />
    </template>
  </PageScaffoldFlow>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import type { PartnerRequestSummary } from "@partner-up-dev/backend";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import ContactSupportFooter from "@/domains/support/ui/sections/ContactSupportFooter.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PRStatusBadge from "@/domains/pr/ui/primitives/PRStatusBadge.vue";
import PageScaffoldFlow from "@/shared/ui/layout/PageScaffoldFlow.vue";
import { useMyCreatedPRs } from "@/domains/pr/queries/useMyCreatedPRs";
import { useMyJoinedPRs } from "@/domains/pr/queries/useMyJoinedPRs";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";
import { resolvePRSummaryPath } from "@/domains/pr/routing/routes";
import { formatLocalDateTimeValue } from "@/shared/datetime/formatLocalDateTime";

const router = useRouter();
const { t } = useI18n();
const userSessionStore = useUserSessionStore();
const createdQuery = useMyCreatedPRs();
const joinedQuery = useMyJoinedPRs();

const createdItems = computed(() => createdQuery.data.value ?? []);
const joinedItems = computed(() => joinedQuery.data.value ?? []);
const createdIds = computed(
  () => new Set(createdItems.value.map((item) => item.id)),
);

const joinedDisplayItems = computed(() =>
  joinedItems.value.filter((item) => !createdIds.value.has(item.id)),
);

const createdErrorMessage = computed(() => {
  const error = createdQuery.error.value;
  return error instanceof Error ? error.message : t("myPrsPage.loadFailed");
});

const joinedErrorMessage = computed(() => {
  const error = joinedQuery.error.value;
  return error instanceof Error ? error.message : t("myPrsPage.loadFailed");
});

const goToPR = (item: PartnerRequestSummary) => {
  router.push(resolvePRSummaryPath(item));
};

const formatDate = (dateStr: string) => {
  return formatLocalDateTimeValue(dateStr) ?? dateStr;
};
</script>

<style scoped lang="scss">
.page-main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-lg);
}

.auth-hint,
.empty-text,
.error-text {
  @include mx.pu-font(body-medium);
  margin: 0;
}

.auth-hint,
.empty-text {
  color: var(--sys-color-on-surface-variant);
}

.error-text {
  color: var(--sys-color-error);
}

.list-section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  h2 {
    @include mx.pu-font(title-medium);
    margin: 0;
    color: var(--sys-color-on-surface);
  }
}

.count {
  @include mx.pu-font(label-medium);
  color: var(--sys-color-on-surface-variant);
  background: var(--sys-color-surface-container);
  border-radius: var(--sys-radius-lg);
  padding: var(--sys-spacing-xs) var(--sys-spacing-sm);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.list-item {
  width: 100%;
  text-align: left;
  @include mx.pu-selection-card(default, low);
  cursor: pointer;

  &:hover {
    background: var(--sys-color-surface-container);
  }
}

.item-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--sys-spacing-sm);
}

.item-text {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);
  min-width: 0;
}

.item-name {
  @include mx.pu-font(body-large);
  color: var(--sys-color-on-surface);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-time {
  @include mx.pu-font(label-large);
  color: var(--sys-color-on-surface-variant);
}
</style>
