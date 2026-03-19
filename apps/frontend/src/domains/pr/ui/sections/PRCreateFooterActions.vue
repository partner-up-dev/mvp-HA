<template>
  <footer class="page-footer">
    <button
      class="save-btn"
      type="button"
      :disabled="pending"
      @click="emit('submit-as', 'DRAFT')"
    >
      {{
        pending && pendingStatus === "DRAFT"
          ? t("createPage.savePending")
          : t("common.save")
      }}
    </button>
    <button
      class="create-btn"
      type="button"
      :disabled="pending"
      @click="emit('submit-as', 'PUBLISH')"
    >
      {{
        pending && pendingStatus === "PUBLISH"
          ? t("createPage.createPending")
          : t("common.create")
      }}
    </button>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CreateSubmissionMode } from "@/domains/pr/use-cases/useCommunityPRCreateFlow";

defineProps<{
  pending: boolean;
  pendingStatus: CreateSubmissionMode;
}>();

const emit = defineEmits<{
  "submit-as": [status: CreateSubmissionMode];
}>();

const { t } = useI18n();
</script>

<style lang="scss" scoped>
.page-footer {
  display: flex;
  gap: var(--sys-spacing-sm);
  margin-top: var(--sys-spacing-lg);
}

.save-btn,
.create-btn {
  @include mx.pu-font(label-large);
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.save-btn {
  @include mx.pu-rect-action(outline, default);
}

.create-btn {
  @include mx.pu-rect-action(primary, default);
}
</style>
