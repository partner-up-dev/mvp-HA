<template>
  <div class="wechat-chat-method">
    <div class="preview-section">
      <h4 class="preview-title">微信分享卡片预览</h4>

      <div class="poster-preview">
        <div v-if="isWorking" class="generating-state">
          <div class="poster-placeholder">
            <div class="spinner"></div>
            <p>生成缩略图中...</p>
          </div>
        </div>
        <div v-else-if="posterUrl" class="poster-container">
          <img :src="posterUrl" alt="分享缩略图预览" class="poster-image" />
          <p class="helper-text">该缩略图将用于微信分享卡片的图片</p>
        </div>
        <div v-else class="empty-state">
          <p>尚未生成缩略图</p>
        </div>
      </div>
    </div>

    <div class="action-section">
      <button
        class="primary-btn"
        @click="handleGenerateAndUpdate"
        :disabled="isWorking"
      >
        {{ primaryButtonLabel }}
      </button>

      <div v-if="errorText" class="error-text">{{ errorText }}</div>
      <div v-else class="guidance-text">
        <p>更新完成后，请点击微信右上角“…”</p>
        <p class="sub-text">选择“发送给朋友”或“分享到朋友圈”</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useGenerateWechatThumbHtml } from "@/queries/useGenerateWechatThumbHtml";
import { renderPosterHtmlToBlob } from "@/composables/renderHtmlPoster";
import { useGenerateWechatThumbPoster } from "@/composables/useGenerateWechatThumbPoster";
import { useCloudStorage } from "@/composables/useCloudStorage";
import { useWeChatShare } from "@/composables/useWeChatShare";
import { client } from "@/lib/rpc";
import type { ShareToWechatChatProps } from "./ShareToWechat";

const props = defineProps<ShareToWechatChatProps>();

const styleIndex = ref(0);
const errorMessage = ref<string | null>(null);
const lastUploadedThumbnailUrl = ref<string | null>(null);
const posterUrl = ref<string | null>(null);
const isRendering = ref(false);

const {
  mutateAsync: generateThumbHtmlAsync,
  isPending: isThumbHtmlGenerating,
} = useGenerateWechatThumbHtml();
const { generateThumb, isGenerating: isFallbackThumbGenerating } =
  useGenerateWechatThumbPoster();
const { uploadFile, isUploading, uploadError } = useCloudStorage();
const { initWeChatSdk, setWeChatShareCard, initError } = useWeChatShare();

const isWorking = computed(
  () =>
    isThumbHtmlGenerating.value ||
    isFallbackThumbGenerating.value ||
    isRendering.value ||
    isUploading.value,
);

const primaryButtonLabel = computed(() => {
  if (isWorking.value) return "生成中...";
  if (lastUploadedThumbnailUrl.value) return "重新生成并更新分享卡片";
  return "生成并更新分享卡片";
});

const normalizeShareUrl = (rawUrl: string): string => {
  try {
    const url = new URL(rawUrl);
    url.hash = "";
    return url.toString();
  } catch {
    return rawUrl.split("#")[0] ?? rawUrl;
  }
};

const buildShareTitle = (): string => {
  const title = props.prData.title?.trim();
  return title && title.length > 0 ? title : "搭一搭 - PartnerUp";
};

const truncateDesc = (raw: string, maxLen: number): string => {
  const text = raw.replace(/\s+/g, " ").trim();
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1)}…`;
};

const buildShareDesc = (): string => truncateDesc(props.rawText, 80);

const pickFallbackKeyText = (): string => {
  const title = props.prData.title?.trim();
  if (title && title.length > 0) return title.slice(0, 3);

  const scenario = props.prData.scenario?.trim();
  if (scenario && scenario.length > 0) return scenario.slice(0, 3);

  return "搭";
};

const handleGenerateAndUpdate = async (): Promise<void> => {
  errorMessage.value = null;

  try {
    await initWeChatSdk();

    let blob: Blob;

    try {
      isRendering.value = true;
      const spec = await generateThumbHtmlAsync({
        prId: props.prId,
        style: styleIndex.value,
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
        "HTML thumbnail generation failed, fallback to template:",
        error,
      );
      blob = await generateThumb(pickFallbackKeyText(), styleIndex.value);
    } finally {
      isRendering.value = false;
    }

    const thumbnailUrl = await uploadFile(blob, "wechat-share-thumb.png");
    lastUploadedThumbnailUrl.value = thumbnailUrl;
    posterUrl.value = thumbnailUrl;

    // Cache the thumbnail URL in backend
    try {
      await client.api.share["wechat-card"]["cache-thumbnail"].$post({
        json: {
          prId: props.prId,
          style: styleIndex.value,
          posterUrl: thumbnailUrl,
        },
      });
    } catch (cacheError) {
      console.warn("Failed to cache thumbnail URL:", cacheError);
      // Don't fail the whole operation
    }

    await setWeChatShareCard({
      title: buildShareTitle(),
      desc: buildShareDesc(),
      link: normalizeShareUrl(props.shareUrl),
      imgUrl: thumbnailUrl,
    });

    styleIndex.value += 1;
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失败";
    errorMessage.value = message;
    isRendering.value = false;
  }
};

const handleInitialize = async (): Promise<void> => {
  try {
    if (props.prData.wechatThumbnail) {
      const cached = props.prData.wechatThumbnail;
      lastUploadedThumbnailUrl.value = cached.posterUrl;
      posterUrl.value = cached.posterUrl;
      styleIndex.value = cached.style + 1;

      await setWeChatShareCard({
        title: buildShareTitle(),
        desc: buildShareDesc(),
        link: normalizeShareUrl(props.shareUrl),
        imgUrl: cached.posterUrl,
      });
      return;
    }

    await handleGenerateAndUpdate();
  } catch (error) {
    console.error("Failed to initialize poster:", error);
  }
};

const errorText = computed(
  () => errorMessage.value ?? uploadError.value ?? initError.value,
);

// Initialize poster on mount
onMounted(() => {
  handleInitialize();
});
</script>

<style scoped lang="scss" src="./ShareToWechat.scss"></style>
