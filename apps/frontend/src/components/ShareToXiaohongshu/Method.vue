<template>
  <div class="xiaohongshu-method">
    <!-- Options Section -->
    <div v-if="prData" class="options-section">
      <Options :pr-data="prData"></Options>
    </div>

    <!-- Preview Section -->
    <PreviewContent
      :caption="caption"
      :pr-data="prData"
      :poster-url="posterUrl"
      :poster-is-generating="posterIsGenerating"
      :is-caption-generating="isCaptionGenerating"
      @update:caption="handleCaptionUpdate"
      @regenerate="handleRegenerate"
    />

    <!-- Actions Section -->
    <Actions
      :current-caption="caption"
      :poster-is-generating="posterIsGenerating"
      :share-url="shareUrl"
      :pr-data="prData"
      :on-download-poster="handleDownloadPoster"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import PreviewContent from "./PreviewContent.vue";
import Actions from "./Actions.vue";
import Options from "./Options.vue";
import { useGenerateXiaohongshuCaption } from "@/queries/useGenerateXiaohongshuCaption";
import { useGeneratePoster } from "@/composables/useGeneratePoster";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

interface Props {
  shareUrl: string;
  prData: ParsedPartnerRequest;
}

const props = defineProps<Props>();

const caption = ref("");
const posterUrl = ref<string | null>(null);
const posterIsGenerating = ref(false);

const { mutateAsync: generateCaptionAsync, isPending: isCaptionGenerating } =
  useGenerateXiaohongshuCaption();
const { generatePoster } = useGeneratePoster();

// Initialize caption on mount
const handleInitializeCaption = async (prData: ParsedPartnerRequest) => {
  try {
    const newCaption = await generateCaptionAsync(prData);
    caption.value = newCaption;
  } catch (error) {
    console.error("Failed to initialize caption:", error);
  }
};

// Regenerate caption when user clicks refresh button
const handleRegenerate = async () => {
  try {
    const newCaption = await generateCaptionAsync(props.prData);
    caption.value = newCaption;
  } catch (error) {
    console.error("Failed to regenerate caption:", error);
  }
};

// Update caption when user edits textarea
const handleCaptionUpdate = (newCaption: string) => {
  caption.value = newCaption;
};

// Generate poster when caption changes
watch(
  () => caption.value,
  async (newCaption) => {
    if (!newCaption) {
      posterUrl.value = null;
      return;
    }
    try {
      posterIsGenerating.value = true;
      const blob = await generatePoster(newCaption);
      posterUrl.value = URL.createObjectURL(blob);
    } catch (error) {
      console.error("Failed to generate poster:", error);
      posterUrl.value = null;
    } finally {
      posterIsGenerating.value = false;
    }
  },
  { immediate: false },
);

// Download poster
const handleDownloadPoster = async () => {
  if (!posterUrl.value) {
    alert("请先生成海报");
    return;
  }
  try {
    const link = document.createElement("a");
    link.href = posterUrl.value;
    link.download = `poster-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Failed to download poster:", error);
    alert("❌ 下载失败，请重试");
  }
};

// Initialize caption when component mounts
handleInitializeCaption(props.prData);
</script>

<style lang="scss" scoped>
.xiaohongshu-method {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}

.options-section {
  display: flex;
  flex-direction: column;
  gap: var(--sys-spacing-med);
}
</style>
