<template>
  <div class="create-page">
    <PRCreateHeader @back="goHome" />

    <main class="page-main">
      <PRForm
        ref="formRef"
        :initial-fields="initialFields"
        :pin-pr-id="createdPrId"
        :pin-auto-generate="true"
        :pin-show-label="true"
        :pin-show-info="true"
        @submit="handleSubmit"
      />
    </main>

    <PRCreateFooterActions
      :pending="createMutation.isPending.value"
      :pending-status="pendingStatus"
      @submit-as="submitAs"
    />

    <Footer />

    <ErrorToast
      v-if="createMutation.isError.value"
      :message="
        createMutation.error.value?.message || t('createPage.createFailed')
      "
      @close="createMutation.reset()"
    />
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import PRForm from "@/components/pr/PRForm.vue";
import ErrorToast from "@/components/common/ErrorToast.vue";
import Footer from "@/components/common/Footer.vue";
import PRCreateHeader from "@/widgets/pr-create/PRCreateHeader.vue";
import PRCreateFooterActions from "@/widgets/pr-create/PRCreateFooterActions.vue";
import { usePRCreateFlow } from "@/features/pr-create/usePRCreateFlow";

const { t } = useI18n();
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
}
</style>
