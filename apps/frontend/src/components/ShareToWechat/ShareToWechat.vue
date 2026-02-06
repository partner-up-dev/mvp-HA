<template>
  <div class="wechat-chat-method">
    <div class="options-section flex flex-col">
      <button
        class="outline-btn"
        @click="handleGenerateAndUpdate"
        :disabled="isWorking"
      >
        {{ switchButtonLabel }}
      </button>
    </div>

    <div class="preview-section">
      <h4 class="preview-title">{{ t("share.wechat.previewTitle") }}</h4>

      <div class="poster-preview">
        <div v-if="isWorking" class="generating-state">
          <div class="poster-placeholder">
            <div class="spinner"></div>
            <p>{{ t("share.wechat.generating") }}</p>
          </div>
        </div>
        <div v-else>
          <WeChatChatPreview
            :poster-url="posterUrl"
            :share-title="shareTitle"
            :share-desc="shareDescPreview"
            :thumb-placeholder="thumbPlaceholder"
          />
        </div>
      </div>
    </div>

    <div class="action-section">
      <div v-if="errorText" class="error-text">{{ errorText }}</div>
      <div v-else class="guidance-text">
        <p>{{ t("share.wechat.guidanceLine1") }}</p>
        <p class="sub-text">{{ t("share.wechat.guidanceLine2") }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { useGenerateWechatThumbHtml } from "@/queries/useGenerateWechatThumbHtml";
import { renderPosterHtmlToBlob } from "@/composables/renderHtmlPoster";
import { useGenerateWechatThumbPoster } from "@/composables/useGenerateWechatThumbPoster";
import { useCloudStorage } from "@/composables/useCloudStorage";
import { useWeChatShare } from "@/composables/useWeChatShare";
import { client } from "@/lib/rpc";
import type { ShareToWechatChatProps } from "./ShareToWechat";
import WeChatChatPreview from "./WeChatChatPreview.vue";

const props = defineProps<ShareToWechatChatProps>();
const { t } = useI18n();

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

const switchButtonLabel = computed(() => {
  if (isWorking.value) return t("share.wechat.generating");
  if (lastUploadedThumbnailUrl.value) return t("share.wechat.switchStyle");
  return t("share.wechat.switchStyle");
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
  return title && title.length > 0 ? title : t("share.wechat.defaultShareTitle");
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

  const type = props.prData.type?.trim();
  if (type && type.length > 0) return type.slice(0, 3);

  return t("share.wechat.fallbackKeyText");
};

const shareTitle = computed(() => buildShareTitle());
const shareDesc = computed(() => buildShareDesc());
const shareDescPreview = computed(() => truncateDesc(props.rawText, 36));
const thumbPlaceholder = computed(() => pickFallbackKeyText());

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
    }

    await setWeChatShareCard({
      title: shareTitle.value,
      desc: shareDesc.value,
      link: normalizeShareUrl(props.shareUrl),
      imgUrl: thumbnailUrl,
    });

    styleIndex.value += 1;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : t("common.operationFailed");
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
        title: shareTitle.value,
        desc: shareDesc.value,
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

onMounted(() => {
  handleInitialize();
});
</script>

<style scoped lang="scss" src="./ShareToWechat.scss"></style>
