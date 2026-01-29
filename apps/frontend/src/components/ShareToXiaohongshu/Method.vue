<template>
  <div class="xiaohongshu-method">
    <!-- Options Section -->
    <div v-if="prData" class="options-section">
      <Options
        :pr-data="prData"
        :is-pending="isCaptionGenerating"
        @regenerate="handleRegenerate"
      ></Options>
    </div>

    <!-- Preview Section -->
    <PreviewContent
      :caption="caption"
      :pr-data="prData"
      :poster-url="posterUrl"
      :poster-is-generating="posterIsGenerating"
      :is-caption-generating="isCaptionGenerating"
      :is-transitioning="isTransitioning"
      :is-poster-transitioning="isPosterTransitioning"
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

// Frontend no longer knows style names; use numeric index

const caption = ref("");
const posterUrl = ref<string | null>(null);
const posterIsGenerating = ref(false);
const currentStyleIndex = ref(0);
const generatedCaptions = ref<Map<number, string>>(new Map());
const isTransitioning = ref(false);
const isPosterTransitioning = ref(false);

const { mutateAsync: generateCaptionAsync, isPending: isCaptionGenerating } =
  useGenerateXiaohongshuCaption();
const { generatePoster } = useGeneratePoster();

// Initialize caption on mount (random style)
const handleInitializeCaption = async (prData: ParsedPartnerRequest) => {
  try {
    // start from 0 (backend handles wraparound), or pick random int if desired
    currentStyleIndex.value = 0;

    const newCaption = await generateCaptionAsync({
      prData,
      style: currentStyleIndex.value,
    });
    caption.value = newCaption;

    // cache generated caption under numeric index
    generatedCaptions.value.set(currentStyleIndex.value, newCaption);
  } catch (error) {
    console.error("Failed to initialize caption:", error);
  }
};

// Regenerate caption when user clicks refresh button (cycle through styles)
const handleRegenerate = async () => {
  try {
    isTransitioning.value = true;

    // 切换到下一个风格（只递增，后端负责 wraparound）
    currentStyleIndex.value = currentStyleIndex.value + 1;

    let newCaption: string;

    // 检查是否已有缓存
    if (generatedCaptions.value.has(currentStyleIndex.value)) {
      newCaption = generatedCaptions.value.get(currentStyleIndex.value)!;
    } else {
      // 生成新文案
      newCaption = await generateCaptionAsync({
        prData: props.prData,
        style: currentStyleIndex.value,
      });
      // 缓存生成的文案
      generatedCaptions.value.set(currentStyleIndex.value, newCaption);
    }

    // 添加短暂延迟创建切换效果
    setTimeout(() => {
      caption.value = newCaption;
      isTransitioning.value = false;
    }, 150);
  } catch (error) {
    console.error("Failed to regenerate caption:", error);
    isTransitioning.value = false;
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

      // Add delay to show placeholder longer (1.5 seconds)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const blob = await generatePoster(newCaption);

      // Add transition effect
      isPosterTransitioning.value = true;
      posterUrl.value = URL.createObjectURL(blob);

      // Remove transition state after animation completes
      setTimeout(() => {
        isPosterTransitioning.value = false;
      }, 300);
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
