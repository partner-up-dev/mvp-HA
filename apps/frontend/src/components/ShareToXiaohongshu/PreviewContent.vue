<template>
  <div class="xiaohongshu-preview">
    <CaptionEditor
      :caption="caption"
      :disabled="isCaptionGenerating"
      @update:caption="$emit('update:caption', $event)"
    />
    <PosterPreview
      :caption="caption"
      :poster-url="posterUrl"
      :is-generating="posterIsGenerating"
    />
  </div>
</template>

<script setup lang="ts">
import CaptionEditor from "./CaptionEditor.vue";
import PosterPreview from "./PosterPreview.vue";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

interface Props {
  caption: string;
  prData: ParsedPartnerRequest;
  posterUrl: string | null;
  posterIsGenerating: boolean;
  isCaptionGenerating: boolean;
}

defineProps<Props>();

defineEmits<{
  "update:caption": [caption: string];
  regenerate: [];
}>();
</script>

<style scoped lang="scss">
.xiaohongshu-preview {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
  min-height: 200px;
}
</style>
