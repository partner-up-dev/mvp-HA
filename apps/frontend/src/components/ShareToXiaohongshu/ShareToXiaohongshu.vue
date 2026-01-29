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
          :disabled="!caption || posterIsGenerating"
        >
          {{ posterIsGenerating ? "生成中..." : "下载海报" }}
        </button>
      </div>
      <button class="primary-btn" @click="handleOpenApp">
        分享到小红书
        <div class="i-mdi-arrow-top-right"></div>
      </button>
    </div>

    <!-- Debug Section -->
    <div class="debug-section" v-if="debugMessages.length > 0">
      <h4>Debug Logs:</h4>
      <ul>
        <li v-for="(msg, index) in debugMessages.slice(-10)" :key="index">
          {{ msg }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from "vue";
import { useAppScheme } from "@/composables/useAppScheme";
import { useGenerateXiaohongshuCaption } from "@/queries/useGenerateXiaohongshuCaption";
import { useGeneratePoster } from "@/composables/useGeneratePoster";
import { useCloudStorage } from "@/composables/useCloudStorage";
import { isWeChatBrowser } from "@/lib/browser-detection";
import type { ParsedPartnerRequest } from "@partner-up-dev/backend";
import {
  TIMING_CONSTANTS,
  copyToClipboard,
  downloadBlob,
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
const debugMessages = ref<string[]>([]);

// Composables
const { mutateAsync: generateCaptionAsync, isPending: isCaptionGenerating } =
  useGenerateXiaohongshuCaption();
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
 * Generate poster when caption changes
 */
watch(
  () => caption.value,
  async (newCaption) => {
    if (!newCaption) {
      posterUrl.value = null;
      debugMessages.value.push("Caption is empty, clearing poster URL");
      console.log("Caption is empty, clearing poster URL");
      return;
    }
    try {
      posterIsGenerating.value = true;
      debugMessages.value.push("Starting poster generation");
      console.log("Starting poster generation for caption:", newCaption);

      // Show placeholder longer for better UX
      await delayMs(TIMING_CONSTANTS.POSTER_GENERATION_DELAY);
      debugMessages.value.push("Delay completed, generating poster blob");
      console.log("Delay completed, generating poster blob");

      const blob = await generatePoster(newCaption);
      debugMessages.value.push(
        `Poster blob generated, size: ${blob.size} bytes`,
      );
      console.log("Poster blob generated:", blob);

      // Add transition effect
      isPosterTransitioning.value = true;
      debugMessages.value.push("Starting transition effect");
      console.log("Starting transition effect");

      const isWeChat = isWeChatBrowser();
      debugMessages.value.push(`isWeChatBrowser: ${isWeChat}`);
      console.log("isWeChatBrowser:", isWeChat);

      if (isWeChat) {
        // Upload to server for WeChat browser
        debugMessages.value.push(
          "Detected WeChat browser, uploading to server",
        );
        console.log("Detected WeChat browser, uploading to server");
        try {
          const downloadUrl = await uploadFile(blob, "poster.png");
          posterUrl.value = downloadUrl;
          debugMessages.value.push(`Upload successful, URL: ${downloadUrl}`);
          console.log("Upload successful, URL:", downloadUrl);
        } catch (uploadError) {
          debugMessages.value.push(
            `Upload failed: ${uploadError}, falling back to blob URL`,
          );
          console.warn("Upload failed, falling back to blob URL:", uploadError);
          // Fallback to blob URL with warning
          posterUrl.value = URL.createObjectURL(blob);
          debugMessages.value.push("Fallback to blob URL");
          console.log("Fallback to blob URL");
        }
      } else {
        // Use blob URL for other browsers
        posterUrl.value = URL.createObjectURL(blob);
        debugMessages.value.push("Using blob URL for non-WeChat browser");
        console.log("Using blob URL for non-WeChat browser");
      }

      // Remove transition state after animation completes (fire and forget)
      setTimeout(() => {
        isPosterTransitioning.value = false;
        debugMessages.value.push("Transition completed");
        console.log("Transition completed");
      }, TIMING_CONSTANTS.POSTER_TRANSITION_DURATION);
    } catch (error) {
      debugMessages.value.push(`Failed to generate poster: ${error}`);
      console.error("Failed to generate poster:", error);
      posterUrl.value = null;
    } finally {
      posterIsGenerating.value = false;
      debugMessages.value.push("Poster generation process finished");
      console.log("Poster generation process finished");
    }
  },
  { immediate: false },
);

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
handleInitializeCaption(props.prData);
</script>

<style scoped lang="scss" src="./ShareToXiaohongshu.scss"></style>
