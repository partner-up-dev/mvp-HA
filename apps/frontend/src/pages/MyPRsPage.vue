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
            <PRPreviewCard
              class="list-item"
              :pr-id="item.id"
            />
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
            <PRPreviewCard
              class="list-item"
              :pr-id="item.id"
            />
          </li>
        </ul>
      </section>
    </div>

    <template #footer>
      <MiniumCommonFooter />
    </template>
  </PageScaffoldFlow>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import LoadingIndicator from "@/shared/ui/feedback/LoadingIndicator.vue";
import MiniumCommonFooter from "@/domains/support/ui/sections/MiniumCommonFooter.vue";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PRPreviewCard from "@/domains/pr/ui/primitives/PRPreviewCard.vue";
import PageScaffoldFlow from "@/shared/ui/layout/PageScaffoldFlow.vue";
import { useMyCreatedPRs } from "@/domains/pr/queries/useMyCreatedPRs";
import { useMyJoinedPRs } from "@/domains/pr/queries/useMyJoinedPRs";
import { useUserSessionStore } from "@/shared/auth/useUserSessionStore";

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

</script>

<style scoped lang="scss">
.page-main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-large);
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
  gap: var(--sys-spacing-small);
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
  border-radius: var(--sys-radius-large);
  padding: var(--sys-spacing-xsmall) var(--sys-spacing-small);
}

.list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-small);
}

.list-item {
  &:hover {
    background: var(--sys-color-surface-container);
  }
}
</style>
