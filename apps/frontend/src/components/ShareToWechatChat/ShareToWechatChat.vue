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

      <button
        class="outline-btn"
        @click="handleTryNextStyle"
        :disabled="isWorking"
      >
        换个风格
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
import { computed, ref } from "vue";
import { useGenerateXiaohongshuCaption } from "@/queries/useGenerateXiaohongshuCaption";
import { useGenerateHtmlPoster } from "@/composables/useGenerateHtmlPoster";
import { useWeChatShare } from "@/composables/useWeChatShare";
import type { ShareToWechatChatProps } from "./ShareToWechatChat";

const props = defineProps<ShareToWechatChatProps>();

const styleIndex = ref(0);
const errorMessage = ref<string | null>(null);
const lastPosterUrl = ref<string | null>(null);

const { mutateAsync: generateCaptionAsync, isPending: isCaptionGenerating } =
  useGenerateXiaohongshuCaption();
const { generatePoster, posterUrl, isGenerating: isPosterGenerating } =
  useGenerateHtmlPoster();
const { initWeChatSdk, setWeChatShareCard, initError } = useWeChatShare();

const isWorking = computed(
  () => isCaptionGenerating.value || isPosterGenerating.value,
);

const primaryButtonLabel = computed(() => {
  if (isWorking.value) return "生成中...";
  if (lastPosterUrl.value) return "重新生成并更新分享卡片";
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

const handleGenerateAndUpdate = async (): Promise<void> => {
  errorMessage.value = null;

  try {
    await initWeChatSdk();

    const caption = await generateCaptionAsync({
      prData: props.prData,
      style: styleIndex.value,
    });

    const { posterUrl: thumbnailUrl } = await generatePoster(
      caption,
      styleIndex.value,
      "3:4",
      true,
    );
    lastPosterUrl.value = thumbnailUrl;

    await setWeChatShareCard({
      title: buildShareTitle(),
      desc: buildShareDesc(),
      link: normalizeShareUrl(props.shareUrl),
      imgUrl: thumbnailUrl,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "操作失败";
    errorMessage.value = message;
  }
};

const handleTryNextStyle = async (): Promise<void> => {
  styleIndex.value = styleIndex.value + 1;
  await handleGenerateAndUpdate();
};

const errorText = computed(
  () => errorMessage.value ?? initError.value,
);
</script>

<style scoped lang="scss" src="./ShareToWechatChat.scss"></style>
