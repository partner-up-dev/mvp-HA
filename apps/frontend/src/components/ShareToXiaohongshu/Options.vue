<template>
  <button class="refresh-btn" @click="handleRefresh" :disabled="isPending">
    {{ isPending ? "生成中..." : "🔄 换一个" }}
  </button>
</template>

<script setup lang="ts">
import { useGenerateXiaohongshuCaption } from "@/queries/useGenerateXiaohongshuCaption";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

interface Props {
  prData: ParsedPartnerRequest;
  isPending?: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  regenerate: [];
}>();

const { mutateAsync, isPending: isGenerating } =
  useGenerateXiaohongshuCaption();

const isPending = props.isPending ?? isGenerating.value;

const handleRefresh = async () => {
  try {
    await mutateAsync(props.prData);
    emit("regenerate");
  } catch (error) {
    console.error("Failed to generate caption:", error);
  }
};
</script>

<style lang="scss" scoped>
.refresh-btn {
  @include mx.pu-font(label-large);
  width: 100%;
  padding: var(--sys-spacing-sm) var(--sys-spacing-med);
  min-height: var(--sys-size-med);
  border: 1px solid var(--sys-color-outline-variant);
  border-radius: var(--sys-radius-sm);
  background: transparent;
  color: var(--sys-color-on-primary);
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: var(--sys-color-primary-container);
    color: var(--sys-color-on-primary-container);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--sys-color-on-primary);
    outline-offset: 2px;
  }
}
</style>
