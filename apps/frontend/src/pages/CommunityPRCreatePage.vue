<template>
  <PageScaffoldFlow class="create-page" data-page="community-pr-create">
    <template #header>
      <PRCreateHeader @back="goHome" />
    </template>

    <div class="page-main">
      <TabBar
        :items="modeTabs"
        :model-value="activeMode"
        :aria-label="t('createPage.modeSwitchAria')"
        @update:model-value="handleModeChange"
        data-region="mode-switch"
      />

      <section
        v-show="activeMode === 'nl'"
        class="mode-panel"
        data-region="create-form"
      >
        <header class="mode-panel-header">
          <h2>{{ t("createPage.nlModeTitle") }}</h2>
          <p>{{ t("createPage.nlModeDescription") }}</p>
        </header>

        <NLPRForm />
      </section>

      <section
        v-show="activeMode === 'form'"
        class="mode-panel"
        data-region="create-form"
      >
        <header class="mode-panel-header">
          <h2>{{ t("createPage.formModeTitle") }}</h2>
          <p>{{ t("createPage.formModeDescription") }}</p>
        </header>

        <PRForm
          ref="formRef"
          :initial-fields="initialFields"
          @submit="handleSubmit"
        />
      </section>
    </div>

    <template #actions>
      <div data-region="actions">
        <PRCreateFooterActions
          v-if="activeMode === 'form'"
          :pending="
            createMutation.isPending.value || publishMutation.isPending.value
          "
          :pending-status="pendingStatus"
          @submit-as="submitAs"
        />
      </div>
    </template>

    <template #footer>
      <ContactSupportFooter data-region="support" />
    </template>

    <ErrorToast
      v-if="
        activeMode === 'form' &&
        (createMutation.isError.value || publishMutation.isError.value)
      "
      :message="
        createMutation.error.value?.message ||
        publishMutation.error.value?.message ||
        t('createPage.createFailed')
      "
      @close="
        createMutation.reset();
        publishMutation.reset();
      "
    />
  </PageScaffoldFlow>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import PRForm from "@/domains/pr/ui/forms/PRForm.vue";
import NLPRForm from "@/domains/pr/ui/forms/NLPRForm.vue";
import ErrorToast from "@/shared/ui/feedback/ErrorToast.vue";
import TabBar from "@/shared/ui/navigation/TabBar.vue";
import ContactSupportFooter from "@/domains/support/ui/sections/ContactSupportFooter.vue";
import PageScaffoldFlow from "@/shared/ui/layout/PageScaffoldFlow.vue";
import PRCreateHeader from "@/domains/pr/ui/sections/PRCreateHeader.vue";
import PRCreateFooterActions from "@/domains/pr/ui/sections/PRCreateFooterActions.vue";
import { useCommunityPRCreateFlow } from "@/domains/pr/use-cases/useCommunityPRCreateFlow";

const resolveQueryMode = (value: unknown): "nl" | "form" | null => {
  if (value === "nl" || value === "form") return value;
  return null;
};

const hasTopicQuery = (value: unknown): boolean => {
  if (typeof value === "string") return value.trim().length > 0;
  if (!Array.isArray(value)) return false;
  return value.some(
    (item) => typeof item === "string" && item.trim().length > 0,
  );
};

const { t } = useI18n();
const route = useRoute();
const {
  createMutation,
  publishMutation,
  initialFields,
  formRef,
  pendingStatus,
  submitAs,
  handleSubmit,
  goHome,
} = useCommunityPRCreateFlow();

const initialMode =
  resolveQueryMode(route.query.mode) ??
  (hasTopicQuery(route.query.topic) ? "form" : "nl");

const activeMode = ref<"nl" | "form">(initialMode);
const modeTabs = computed(() => [
  {
    key: "nl",
    label: t("createPage.nlModeTab"),
  },
  {
    key: "form",
    label: t("createPage.formModeTab"),
  },
]);

const setMode = (mode: "nl" | "form") => {
  if (activeMode.value === mode) return;

  activeMode.value = mode;
  if (mode === "nl") {
    createMutation.reset();
    publishMutation.reset();
  }
};

const handleModeChange = (value: string | number) => {
  if (value !== "nl" && value !== "form") return;
  setMode(value);
};
</script>

<style lang="scss" scoped>
.page-main {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.mode-panel {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  border-radius: var(--sys-radius-med);
  border: 1px solid var(--sys-color-outline-variant);
  padding: var(--sys-spacing-med);
}

.mode-panel-header {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-xs);

  h2 {
    @include mx.pu-font(title-medium);
    color: var(--sys-color-on-surface);
    margin: 0;
  }

  p {
    @include mx.pu-font(body-medium);
    color: var(--sys-color-on-surface-variant);
    margin: 0;
  }
}
</style>
