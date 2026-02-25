import { computed, onMounted, ref } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import type { PRShareData } from "@/components/share/types";
import { useGenerateWechatThumbHtml } from "@/queries/useGenerateWechatThumbHtml";
import { renderPosterHtmlToBlob } from "@/composables/renderHtmlPoster";
import { useGenerateWechatThumbPoster } from "@/composables/useGenerateWechatThumbPoster";
import { useCloudStorage } from "@/composables/useCloudStorage";
import { useWeChatShareCard } from "@/composables/useWeChatShareCard";
import { client } from "@/lib/rpc";

type Translate = (key: string) => string;

type UseShareToWechatChatOptions = {
  prId: PRId;
  shareUrl: string;
  prData: PRShareData;
  t: Translate;
};

const toShareDescriptionFallback = (rawText: string): string => {
  const text = rawText.replace(/\s+/g, " ").trim();
  return text.length > 80 ? `${text.slice(0, 79)}…` : text;
};

export const useShareToWechatChat = ({
  prId,
  shareUrl,
  prData,
  t,
}: UseShareToWechatChatOptions) => {
  const styleIndex = ref(0);
  const errorMessage = ref<string | null>(null);
  const lastUploadedThumbnailUrl = ref<string | null>(null);
  const posterUrl = ref<string | null>(null);
  const isRendering = ref(false);
  const shareDesc = ref<string | null>(null);
  const isGeneratingDesc = ref(false);

  const {
    mutateAsync: generateThumbHtmlAsync,
    isPending: isThumbHtmlGenerating,
  } = useGenerateWechatThumbHtml();
  const { generateThumb, isGenerating: isFallbackThumbGenerating } =
    useGenerateWechatThumbPoster();
  const { uploadFile, isUploading, uploadError } = useCloudStorage();
  const { initWeChatSdk, updateWeChatShareCard, initError } =
    useWeChatShareCard();

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

  const buildShareTitle = (): string => {
    const title = prData.title?.trim();
    return title && title.length > 0
      ? title
      : t("share.wechat.defaultShareTitle");
  };

  const pickFallbackKeyText = (): string => {
    const title = prData.title?.trim();
    if (title && title.length > 0) return title.slice(0, 3);

    const type = prData.type?.trim();
    if (type && type.length > 0) return type.slice(0, 3);

    return t("share.wechat.fallbackKeyText");
  };

  const shareTitle = computed(() => buildShareTitle());
  const shareDescPreview = computed(() => {
    if (!shareDesc.value) return t("share.wechat.generating");
    const text = shareDesc.value.replace(/\s+/g, " ").trim();
    if (text.length <= 36) return text;
    return `${text.slice(0, 35)}…`;
  });
  const thumbPlaceholder = computed(() => pickFallbackKeyText());

  const handleThumbnailLoadError = async (): Promise<void> => {
    console.warn("Thumbnail image failed to load, regenerating...");
    posterUrl.value = null;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });
    await handleGenerateAndUpdate();
  };

  const handleGenerateAndUpdate = async (): Promise<void> => {
    errorMessage.value = null;

    try {
      await initWeChatSdk();

      let blob: Blob;

      try {
        isRendering.value = true;
        const spec = await generateThumbHtmlAsync({
          prId,
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

      const thumbnailUrl = await uploadFile(blob);
      lastUploadedThumbnailUrl.value = thumbnailUrl;
      posterUrl.value = thumbnailUrl;

      try {
        await client.api.share["wechat-card"]["cache-thumbnail"].$post({
          json: {
            prId,
            style: styleIndex.value,
            posterUrl: thumbnailUrl,
          },
        });
      } catch (cacheError) {
        console.warn("Failed to cache thumbnail URL:", cacheError);
      }

      await updateWeChatShareCard({
        title: shareTitle.value,
        desc: shareDesc.value || t("home.subtitle"),
        link: shareUrl,
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

  const generateDescriptionAsync = async (): Promise<void> => {
    if (shareDesc.value) return;

    try {
      isGeneratingDesc.value = true;
      const res = await client.api.share["wechat-card"][
        "generate-description"
      ].$post({
        json: {
          prId,
        },
      });

      if (res.ok) {
        const data = (await res.json()) as { description: string };
        shareDesc.value = data.description;
      } else {
        console.warn("Failed to generate description, using rawText");
        shareDesc.value = toShareDescriptionFallback(prData.rawText);
      }
    } catch (error) {
      console.warn("Error generating description:", error);
      shareDesc.value = toShareDescriptionFallback(prData.rawText);
    } finally {
      isGeneratingDesc.value = false;
    }
  };

  const handleInitialize = async (): Promise<void> => {
    try {
      void generateDescriptionAsync();

      if (prData.wechatThumbnail) {
        const cached = prData.wechatThumbnail;
        lastUploadedThumbnailUrl.value = cached.posterUrl;
        posterUrl.value = cached.posterUrl;
        styleIndex.value = cached.style + 1;

        await updateWeChatShareCard({
          title: shareTitle.value,
          desc: shareDesc.value || t("home.subtitle"),
          link: shareUrl,
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
    void handleInitialize();
  });

  return {
    switchButtonLabel,
    isWorking,
    posterUrl,
    shareTitle,
    shareDescPreview,
    thumbPlaceholder,
    errorText,
    handleGenerateAndUpdate,
    handleThumbnailLoadError,
  };
};

