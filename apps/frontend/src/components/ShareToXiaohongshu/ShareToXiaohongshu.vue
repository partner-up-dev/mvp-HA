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
        :value="caption?.caption"
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
        <div v-if="posterUrl" class="poster-container">
          <div class="poster-image-wrapper">
            <img
              :src="posterUrl"
              alt="分享海报"
              class="poster-image"
              :class="{
                'poster-transitioning': isPosterTransitioning,
                'poster-loading': posterIsGenerating,
              }"
            />
            <div v-if="posterIsGenerating" class="poster-loading-overlay">
              <div class="spinner"></div>
            </div>
          </div>
          <div class="guidance-text">
            <p>📱 长按图片保存到相册</p>
            <p class="sub-text">或分享到您的小红书</p>
          </div>
        </div>
        <div v-else-if="posterIsGenerating" class="generating-state">
          <div class="poster-placeholder">
            <div class="spinner"></div>
            <p>🎨 生成海报中...</p>
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
          :disabled="!caption?.caption || copyState !== 'idle'"
        >
          {{ copyButtonLabel }}
        </button>
        <button
          class="outline-btn download-poster-btn"
          @click="handleDownloadPoster"
          :disabled="
            !caption?.caption || posterIsGenerating || isWeChatBrowser()
          "
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
import { useGenerateXhsPosterHtml } from "@/queries/useGenerateXhsPosterHtml";
import { useGeneratePoster } from "@/composables/useGeneratePoster";
import { renderPosterHtmlToBlob } from "@/composables/renderHtmlPoster";
import { useCloudStorage } from "@/composables/useCloudStorage";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { client } from "@/lib/rpc";
import type { PartnerRequestFields, PRId } from "@partner-up-dev/backend";
import {
  TIMING_CONSTANTS,
  copyToClipboard,
  downloadBlob,
  formatCaptionWithUrl,
  generatePosterFilename,
  delayMs,
} from "./ShareToXiaohongshu";

const DEFAULT_POSTER_STYLE_PROMPT =
  "简洁大方的信息展示风格，文字清晰易读，留白充足，色彩克制，传递可信感";

interface Props {
  shareUrl: string;
  prId: PRId;
  prData: PartnerRequestFields & {
    xiaohongshuPoster?: {
      caption: string;
      posterStylePrompt: string;
      posterUrl: string;
      createdAt: string;
    } | null;
  };
}

const props = defineProps<Props>();

// State
const caption = ref<{ caption: string; posterStylePrompt: string } | null>(
  null,
);
const posterUrl = ref<string | null>(null);
const posterIsGenerating = ref(false);
const posterStylePrompt = ref(DEFAULT_POSTER_STYLE_PROMPT);
const captionCounter = ref(0);
const generatedCaptions = ref<
  Map<
    number,
    { caption: string; posterStylePrompt: string; posterUrl?: string }
  >
>(new Map());
const isTransitioning = ref(false);
const isPosterTransitioning = ref(false);
const copyState = ref<"idle" | "copied" | "error">("idle");
const posterGenerationTimeoutId = ref<number | null>(null);

// Composables
const { mutateAsync: generateCaptionAsync, isPending: isCaptionGenerating } =
  useGenerateXiaohongshuCaption();
const { mutateAsync: generatePosterHtmlAsync } = useGenerateXhsPosterHtml();
const { generatePoster } = useGeneratePoster();
const { uploadFile } = useCloudStorage();
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
const handleInitializeCaption = async () => {
  try {
    captionCounter.value = 0;

    if (props.prData.xiaohongshuPoster) {
      const cached = props.prData.xiaohongshuPoster;
      const initialCaption = {
        caption: cached.caption,
        posterStylePrompt: cached.posterStylePrompt,
        posterUrl: cached.posterUrl,
      };
      caption.value = initialCaption;
      generatedCaptions.value.set(captionCounter.value, initialCaption);
      posterStylePrompt.value = cached.posterStylePrompt;
      posterUrl.value = cached.posterUrl;
      return;
    }

    const newCaption = await generateCaptionAsync({
      prId: props.prId,
      style: captionCounter.value,
    });
    caption.value = newCaption;
    generatedCaptions.value.set(captionCounter.value, newCaption);
    posterStylePrompt.value = newCaption.posterStylePrompt;

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

    captionCounter.value = captionCounter.value + 1;

    let newCaption: {
      caption: string;
      posterStylePrompt: string;
      posterUrl?: string;
    };

    // Check cache first
    if (generatedCaptions.value.has(captionCounter.value)) {
      newCaption = generatedCaptions.value.get(captionCounter.value)!;
    } else {
      // Generate new caption
      newCaption = await generateCaptionAsync({
        prId: props.prId,
        style: captionCounter.value,
      });
      generatedCaptions.value.set(captionCounter.value, newCaption);
    }

    // Add transition delay
    await delayMs(TIMING_CONSTANTS.CAPTION_TRANSITION_DELAY);
    caption.value = newCaption;
    posterStylePrompt.value = newCaption.posterStylePrompt;
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
  if (caption.value) {
    caption.value.caption = target.value;
    posterStylePrompt.value = DEFAULT_POSTER_STYLE_PROMPT;
  }
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
const generatePosterForCurrentCaption = async (): Promise<void> => {
  const currentCaption = caption.value?.caption;

  if (!currentCaption) {
    posterUrl.value = null;
    return;
  }

  // If we have a cached poster for this caption index (and caption matches), use it.
  const cachedData = generatedCaptions.value.get(captionCounter.value);
  if (cachedData?.posterUrl && cachedData.caption === currentCaption) {
    posterUrl.value = cachedData.posterUrl;
    return;
  }

  try {
    posterIsGenerating.value = true;

    if (TIMING_CONSTANTS.POSTER_GENERATION_DELAY > 0) {
      await delayMs(TIMING_CONSTANTS.POSTER_GENERATION_DELAY);
    }

    let blob: Blob;

    try {
      const spec = await generatePosterHtmlAsync({
        prId: props.prId,
        caption: currentCaption,
        posterStylePrompt: posterStylePrompt.value,
      });

      blob = await renderPosterHtmlToBlob({
        html: spec.html,
        width: spec.width,
        height: spec.height,
        backgroundColor: spec.backgroundColor,
        scale: 2,
      });
    } catch (error) {
      console.warn(
        "HTML poster generation failed, fallback to template:",
        error,
      );
      blob = await generatePoster(currentCaption, captionCounter.value);
    }

    // Add transition effect
    isPosterTransitioning.value = true;

    let nextPosterUrl: string;
    try {
      nextPosterUrl = await uploadFile(blob, "poster.png");
    } catch (uploadError) {
      console.warn("Upload failed, falling back to blob URL:", uploadError);
      nextPosterUrl = URL.createObjectURL(blob);
    }

    posterUrl.value = nextPosterUrl;

    // Cache the poster URL in backend (only meaningful with remote URL)
    if (nextPosterUrl.startsWith("https://") || nextPosterUrl.startsWith("http://")) {
      try {
        await client.api.share.xiaohongshu["cache-poster"].$post({
          json: {
            prId: props.prId,
            caption: currentCaption,
            posterStylePrompt: posterStylePrompt.value,
            posterUrl: nextPosterUrl,
          },
        });
      } catch (cacheError) {
        console.warn("Failed to cache poster URL:", cacheError);
      }
    }

    // Cache the generated poster URL for this caption index (only if caption still matches)
    const entry = generatedCaptions.value.get(captionCounter.value);
    if (entry && entry.caption === currentCaption) {
      entry.posterUrl = nextPosterUrl;
    }

    // Remove transition state after animation completes (fire and forget)
    window.setTimeout(() => {
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
 * Clean up blob URLs when poster URL changes to remote URL
 */
watch(
  () => posterUrl.value,
  (newUrl, oldUrl) => {
    if (
      oldUrl &&
      oldUrl.startsWith("blob:") &&
      newUrl &&
      !newUrl.startsWith("blob:")
    ) {
      URL.revokeObjectURL(oldUrl);
    }
  },
);

/**
 * Copy caption and URL to clipboard
 */
const handleCopyCaptionWithUrl = async () => {
  try {
    const content = formatCaptionWithUrl(
      caption.value?.caption || "",
      props.shareUrl,
    );
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
    const response = await fetch(posterUrl.value);
    const blob = await response.blob();
    downloadBlob(blob, generatePosterFilename());
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
handleInitializeCaption();

// Cleanup timeout on unmount
onUnmounted(() => {
  if (posterGenerationTimeoutId.value) {
    clearTimeout(posterGenerationTimeoutId.value);
  }
});
</script>

<style scoped lang="scss" src="./ShareToXiaohongshu.scss"></style>
