<template>
  <div class="create-page">
    <PRCreateHeader @back="goHome" />

    <main class="page-main">
      <TabBar
        :items="modeTabs"
        :model-value="activeMode"
        :aria-label="t('createPage.modeSwitchAria')"
        @update:model-value="handleModeChange"
      />

      <section v-show="activeMode === 'nl'" class="mode-panel">
        <header class="mode-panel-header">
          <h2>{{ t("createPage.nlModeTitle") }}</h2>
          <p>{{ t("createPage.nlModeDescription") }}</p>
        </header>

        <NLPRForm />
      </section>

      <section v-show="activeMode === 'form'" class="mode-panel">
        <header class="mode-panel-header">
          <h2>{{ t("createPage.formModeTitle") }}</h2>
          <p>{{ t("createPage.formModeDescription") }}</p>
        </header>

        <PRForm
          ref="formRef"
          :initial-fields="initialFields"
          :pin-pr-id="createdPrId"
          :pin-auto-generate="true"
          :pin-show-label="true"
          :pin-show-info="true"
          @submit="handleSubmit"
        />
      </section>
    </main>

    <PRCreateFooterActions
      v-if="activeMode === 'form'"
      :pending="createMutation.isPending.value"
      :pending-status="pendingStatus"
      @submit-as="submitAs"
    />

    <Footer />

    <ErrorToast
      v-if="activeMode === 'form' && createMutation.isError.value"
      :message="
        createMutation.error.value?.message || t('createPage.createFailed')
      "
      @close="createMutation.reset()"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import { useI18n } from "vue-i18n";
import { useRoute } from "vue-router";
import PRForm from "@/components/pr/PRForm.vue";
import NLPRForm from "@/components/pr/NLPRForm.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import Footer from "@/components/common/Footer.vue";
import TabBar from "@/components/common/TabBar.vue";
import PRCreateHeader from "@/widgets/pr-create/PRCreateHeader.vue";
import PRCreateFooterActions from "@/widgets/pr-create/PRCreateFooterActions.vue";
import { usePRCreateFlow } from "@/features/pr-create/usePRCreateFlow";

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
  initialFields,
  formRef,
  pendingStatus,
  createdPrId,
  submitAs,
  handleSubmit,
  goHome,
} = usePRCreateFlow();

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
  }
};

const handleModeChange = (value: string | number) => {
  if (value !== "nl" && value !== "form") return;
  setMode(value);
};
</script>

<style lang="scss" scoped>
.create-page {
  max-width: 480px;
  margin: 0 auto;
  padding: calc(var(--sys-spacing-med) + var(--pu-safe-top))
    calc(var(--sys-spacing-med) + var(--pu-safe-right))
    calc(var(--sys-spacing-med) + var(--pu-safe-bottom))
    calc(var(--sys-spacing-med) + var(--pu-safe-left));
  min-height: var(--pu-vh);
  display: flex;
  flex-direction: column;
}

.page-main {
  flex: 1;
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
