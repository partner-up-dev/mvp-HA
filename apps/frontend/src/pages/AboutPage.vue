<template>
  <PageScaffoldCentered class="about-page">
    <template #header>
      <PageHeader
        :title="t('aboutPage.title')"
        :subtitle="t('aboutPage.description')"
      />
    </template>

    <section class="about-content" :aria-label="t('aboutPage.sectionTitle')">
      <dl class="about-list">
        <div class="about-item">
          <dt>{{ t("aboutPage.productNameLabel") }}</dt>
          <dd>{{ t("app.siteName") }}</dd>
        </div>

        <div class="about-item">
          <dt>{{ t("aboutPage.repositoryLabel") }}</dt>
          <dd>
            <a
              v-if="repositoryUrl"
              :href="repositoryUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="repo-link"
            >
              {{ repositoryUrl }}
            </a>
            <span v-else>{{ t("aboutPage.unknownValue") }}</span>
          </dd>
        </div>

        <div class="about-item">
          <dt>{{ t("aboutPage.frontendCommitLabel") }}</dt>
          <dd>
            <code>{{ frontendCommitHash }}</code>
          </dd>
        </div>

        <div class="about-item">
          <dt>{{ t("aboutPage.backendCommitLabel") }}</dt>
          <dd>
            <code>{{ backendCommitHash }}</code>
          </dd>
        </div>
      </dl>

      <section class="about-item about-item--wechat-follow">
        <button
          class="wechat-follow-action"
          type="button"
          @click="showOfficialAccountQrModal = true"
        >
          {{ t("home.landing.officialAccountAction") }}
        </button>
      </section>

      <p
        v-if="backendBuildMetadataQuery.error.value"
        class="fetch-warning"
        role="status"
      >
        {{ t("aboutPage.backendCommitLoadFailed") }}
      </p>
    </section>

    <OfficialAccountQrModal
      :open="showOfficialAccountQrModal"
      @close="showOfficialAccountQrModal = false"
    />
  </PageScaffoldCentered>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import PageHeader from "@/shared/ui/navigation/PageHeader.vue";
import PageScaffoldCentered from "@/shared/ui/layout/PageScaffoldCentered.vue";
import { frontendBuildInfo } from "@/shared/meta/build-info";
import { useBackendBuildMetadata } from "@/shared/meta/queries/useBackendBuildMetadata";
import OfficialAccountQrModal from "@/shared/wechat/OfficialAccountQrModal.vue";

const { t } = useI18n();
const backendBuildMetadataQuery = useBackendBuildMetadata();
const showOfficialAccountQrModal = ref(false);

const repositoryUrl = computed(
  () =>
    backendBuildMetadataQuery.data.value?.repositoryUrl ??
    frontendBuildInfo.repositoryUrl,
);

const frontendCommitHash = computed(() => frontendBuildInfo.frontendCommitHash);

const backendCommitHash = computed(() => {
  if (backendBuildMetadataQuery.isLoading.value) {
    return t("common.loading");
  }

  return (
    backendBuildMetadataQuery.data.value?.backendCommitHash ??
    t("aboutPage.unknownValue")
  );
});
</script>

<style scoped lang="scss">
.about-content {
  width: min(100%, 42rem);
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.about-list {
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-sm);
}

.about-item {
  @include mx.pu-surface-card(section);

  dt {
    @include mx.pu-font(label-large);
    color: var(--sys-color-on-surface-variant);
    margin: 0 0 var(--sys-spacing-xs);
  }

  dd {
    margin: 0;
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface);
    overflow-wrap: anywhere;
  }

  code {
    @include mx.pu-font(label-medium);
    display: inline-block;
    padding: var(--sys-spacing-xs);
    border-radius: var(--sys-radius-sm);
    background: var(--sys-color-surface-container-low);
    color: var(--sys-color-on-surface);
  }
}

.about-item--wechat-follow {
  h2 {
    @include mx.pu-font(title-small);
    margin: 0;
    color: var(--sys-color-on-surface);
  }

  p {
    @include mx.pu-font(body-medium);
    margin: 0;
    color: var(--sys-color-on-surface-variant);
  }
}

.wechat-follow-action {
  @include mx.pu-font(label-large);
  @include mx.pu-pill-action(solid-primary);
  width: fit-content;
}

.repo-link {
  color: var(--sys-color-primary);
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-primary);
    outline-offset: 2px;
    border-radius: var(--sys-radius-xs);
  }
}

.fetch-warning {
  margin: 0;
  @include mx.pu-font(body-small);
  color: var(--sys-color-error);
}
</style>
