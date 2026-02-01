<template>
  <div class="xiaohongshu-method">
    <!-- Options Section -->
    <div v-if="prData" class="options-section">
      <button
        class="refresh-btn"
        @click="handleRegenerate"
        :disabled="isCaptionGenerating"
      >
        {{ isCaptionGenerating ? "生成中..." : "🔄 换一个" }}
      </button>
    </div>

    <!-- Preview Section -->
    <div class="xiaohongshu-preview">
      <!-- Caption Editor -->
      <textarea
        :value="caption"
        rows="4"
        class="caption-textarea"
        :class="{ transitioning: isTransitioning }"
        placeholder="编辑小红书文案..."
        :disabled="isCaptionGenerating"
        @input="handleCaptionUpdate"
        @blur="handleCaptionBlur"
      ></textarea>

      <!-- Poster Preview -->
      <div class="poster-preview">
        <div v-if="posterIsGenerating" class="generating-state">
          <div class="poster-placeholder">
            <div class="spinner"></div>
            <p>🎨 生成海报中...</p>
          </div>
        </div>
        <div v-else-if="posterUrl" class="poster-container">
          <img
            :src="posterUrl"
            alt="分享海报"
            class="poster-image"
            :class="{ 'poster-transitioning': isPosterTransitioning }"
          />
          <div class="guidance-text">
            <p>📱 长按图片保存到相册</p>
            <p class="sub-text">或分享到您的小红书</p>
          </div>
        </div>
        <div v-else class="empty-state">
          <p>尚未生成海报</p>
        </div>
      </div>
    </div>

    <!-- Actions Section -->
    <div class="action-section">
      <div class="actions-row">
        <button
          class="outline-btn copy-caption-btn"
          :class="{
            success: copyState === 'copied',
            error: copyState === 'error',
          }"
          @click="handleCopyCaptionWithUrl"
          :disabled="!caption || copyState !== 'idle'"
        >
          {{ copyButtonLabel }}
        </button>
        <button
          class="outline-btn download-poster-btn"
          @click="handleDownloadPoster"
          :disabled="!caption || posterIsGenerating || isWeChatBrowser()"
        >
          {{ downloadButtonLabel }}
        </button>
      </div>
      <button class="primary-btn" @click="handleOpenApp">
        分享到小红书
        <div class="i-mdi-arrow-top-right"></div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onUnmounted } from "vue";
import { useAppScheme } from "@/composables/useAppScheme";
import { useGenerateXiaohongshuCaption } from "@/queries/useGenerateXiaohongshuCaption";
import { useGenerateHtmlPoster } from "@/composables/useGenerateHtmlPoster";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { mapStyleIndexToPosterStyle } from "@/lib/poster-style-map";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";
import {
  TIMING_CONSTANTS,
  copyToClipboard,
  formatCaptionWithUrl,
  generatePosterFilename,
  delayMs,
} from "./ShareToXiaohongshu";

interface Props {
  shareUrl: string;
  prData: ParsedPartnerRequest;
}

const props = defineProps<Props>();

// State
const caption = ref("");
const posterUrl = ref<string | null>(null);
const posterIsGenerating = ref(false);
const currentStyleIndex = ref(0);
const generatedCaptions = ref<Map<number, string>>(new Map());
const isTransitioning = ref(false);
const isPosterTransitioning = ref(false);
const copyState = ref<"idle" | "copied" | "error">("idle");
const posterGenerationTimeoutId = ref<number | null>(null);

// Composables
const { mutateAsync: generateCaptionAsync, isPending: isCaptionGenerating } =
  useGenerateXiaohongshuCaption();
const { generatePoster, downloadPoster } = useGenerateHtmlPoster();
const { openXiaohongshu } = useAppScheme();

/**
 * Computed button label for copy caption
 */
const copyButtonLabel = computed(() => {
  if (copyState.value === "copied") return "已复制!";
  if (copyState.value === "error") return "复制失败";
  return "复制文案";
});

/**
 * Computed button label for download poster
 */
const downloadButtonLabel = computed(() => {
  if (posterIsGenerating.value) return "生成中...";
  if (isWeChatBrowser()) return "长按图片保存";
  return "下载海报";
});

/**
 * Flash state for copy action
 */
const flashState = (next: "idle" | "copied" | "error"): void => {
  copyState.value = next;
  window.setTimeout(() => {
    copyState.value = "idle";
  }, 2000);
};

/**
 * Initialize caption on mount
 */
const handleInitializeCaption = async (prData: ParsedPartnerRequest) => {
  try {
    currentStyleIndex.value = 0;

    const newCaption = await generateCaptionAsync({
      prData,
      style: currentStyleIndex.value,
    });
    caption.value = newCaption;
    generatedCaptions.value.set(currentStyleIndex.value, newCaption);

    // Generate poster for initial caption
    await generatePosterForCurrentCaption();
  } catch (error) {
    console.error("Failed to initialize caption:", error);
  }
};

/**
 * Regenerate caption when user clicks refresh button
 */
const handleRegenerate = async () => {
  try {
    isTransitioning.value = true;

    currentStyleIndex.value = currentStyleIndex.value + 1;

    let newCaption: string;

    // Check cache first
    if (generatedCaptions.value.has(currentStyleIndex.value)) {
      newCaption = generatedCaptions.value.get(currentStyleIndex.value)!;
    } else {
      // Generate new caption
      newCaption = await generateCaptionAsync({
        prData: props.prData,
        style: currentStyleIndex.value,
      });
      generatedCaptions.value.set(currentStyleIndex.value, newCaption);
    }

    // Add transition delay
    await delayMs(TIMING_CONSTANTS.CAPTION_TRANSITION_DELAY);
    caption.value = newCaption;
    isTransitioning.value = false;

    // Generate poster for new caption
    await generatePosterForCurrentCaption();
  } catch (error) {
    console.error("Failed to regenerate caption:", error);
    isTransitioning.value = false;
  }
};

/**
 * Update caption when user edits textarea
 */
const handleCaptionUpdate = (event: Event) => {
  const target = event.target as HTMLTextAreaElement;
  caption.value = target.value;
};

/**
 * Handle caption blur - trigger poster generation
 */
const handleCaptionBlur = () => {
  // Cancel any pending poster generation
  if (posterGenerationTimeoutId.value) {
    clearTimeout(posterGenerationTimeoutId.value);
  }

  // Generate poster with a small delay to debounce rapid blur events
  posterGenerationTimeoutId.value = window.setTimeout(() => {
    generatePosterForCurrentCaption();
  }, 100);
};

/**
 * Generate poster for current caption value
 */
const generatePosterForCurrentCaption = async () => {
  const currentCaption = caption.value;

  if (!currentCaption) {
    posterUrl.value = null;
    return;
  }

  try {
    posterIsGenerating.value = true;

    // Show placeholder longer for better UX
    await delayMs(TIMING_CONSTANTS.POSTER_GENERATION_DELAY);

    // Generate poster with current style
    const posterStyle = mapStyleIndexToPosterStyle(currentStyleIndex.value);
    const generatedUrl = await generatePoster(currentCaption, posterStyle);

    // Add transition effect
    isPosterTransitioning.value = true;
    posterUrl.value = generatedUrl;

    // Remove transition state after animation completes (fire and forget)
    setTimeout(() => {
      isPosterTransitioning.value = false;
    }, TIMING_CONSTANTS.POSTER_TRANSITION_DURATION);
  } catch (error) {
    console.error("Failed to generate poster:", error);
    posterUrl.value = null;
  } finally {
    posterIsGenerating.value = false;
  }
};

/**
 * Regenerate poster when style changes (for cached captions)
 */
watch(
  () => currentStyleIndex.value,
  async () => {
    if (caption.value) {
      await generatePosterForCurrentCaption();
    }
  },
);

/**
 * Copy caption and URL to clipboard
 */
const handleCopyCaptionWithUrl = async () => {
  try {
    const content = formatCaptionWithUrl(caption.value, props.shareUrl);
    await copyToClipboard(content);
    flashState("copied");
  } catch (error) {
    console.error("Failed to copy:", error);
    flashState("error");
  }
};

/**
 * Download poster
 */
const handleDownloadPoster = async () => {
  if (!posterUrl.value) {
    alert("请先生成海报");
    return;
  }
  try {
    await downloadPoster(posterUrl.value, generatePosterFilename());
  } catch (error) {
    console.error("Failed to download poster:", error);
    alert("❌ 下载失败，请重试");
  }
};

/**
 * Open Xiaohongshu app
 */
const handleOpenApp = () => {
  openXiaohongshu();
};

// Initialize caption on mount
handleInitializeCaption(props.prData);

// Cleanup timeout on unmount
onUnmounted(() => {
  if (posterGenerationTimeoutId.value) {
    clearTimeout(posterGenerationTimeoutId.value);
  }
});
</script>

<style scoped lang="scss" src="./ShareToXiaohongshu.scss"></style>
