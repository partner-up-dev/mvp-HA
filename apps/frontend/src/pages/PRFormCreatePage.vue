<template>
  <PageScaffoldFlow class="create-page">
    <template #header>
      <PRCreateHeader @back="goHome" />
    </template>

    <div class="page-main">
      <PRForm
        ref="formRef"
        :initial-fields="initialFields"
        @submit="handleSubmit"
      />
    </div>

    <template #actions>
      <PRCreateFooterActions
        :pending="
          createMutation.isPending.value || publishMutation.isPending.value
        "
        :pending-status="pendingStatus"
        @submit-as="submitAs"
      />
    </template>

    <template #footer>
      <Footer />
    </template>

    <ErrorToast
      v-if="createMutation.isError.value || publishMutation.isError.value"
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
import { useI18n } from "vue-i18n";
import PRForm from "@/components/pr/PRForm.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import Footer from "@/components/common/Footer.vue";
import PageScaffoldFlow from "@/widgets/common/PageScaffoldFlow.vue";
import PRCreateHeader from "@/widgets/pr-create/PRCreateHeader.vue";
import PRCreateFooterActions from "@/widgets/pr-create/PRCreateFooterActions.vue";
import { usePRCreateFlow } from "@/features/pr-create/usePRCreateFlow";

const { t } = useI18n();
const {
  createMutation,
  publishMutation,
  initialFields,
  formRef,
  pendingStatus,
  submitAs,
  handleSubmit,
  goHome,
} = usePRCreateFlow();
</script>

<style lang="scss" scoped>
.page-main {
  flex: 1;
}
</style>
