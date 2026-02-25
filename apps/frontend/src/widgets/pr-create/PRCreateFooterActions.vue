<template>
  <footer class="page-footer">
    <button
      class="save-btn"
      type="button"
      :disabled="pending"
      @click="emit('submit-as', 'DRAFT')"
    >
      {{ pending && pendingStatus === "DRAFT" ? t("createPage.savePending") : t("common.save") }}
    </button>
    <button
      class="create-btn"
      type="button"
      :disabled="pending"
      @click="emit('submit-as', 'OPEN')"
    >
      {{
        pending && pendingStatus === "OPEN"
          ? t("createPage.createPending")
          : t("common.create")
      }}
    </button>
  </footer>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import type { CreatePRStructuredStatus } from "@partner-up-dev/backend";

defineProps<{
  pending: boolean;
  pendingStatus: CreatePRStructuredStatus;
}>();

const emit = defineEmits<{
  "submit-as": [status: CreatePRStructuredStatus];
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
  min-height: var(--sys-size-large);
  border-radius: var(--sys-radius-sm);
  cursor: pointer;
}

.save-btn {
  border: 1px solid var(--sys-color-outline);
  background: transparent;
  color: var(--sys-color-on-surface);
}

.create-btn {
  border: none;
  background: var(--sys-color-primary);
  color: var(--sys-color-on-primary);
}
</style>

