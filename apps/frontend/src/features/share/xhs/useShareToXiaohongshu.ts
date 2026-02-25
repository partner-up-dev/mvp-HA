import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import type { PRShareData } from "@/components/share/types";
import { useAppScheme } from "@/composables/useAppScheme";
import { useGenerateXiaohongshuCaption } from "@/queries/useGenerateXiaohongshuCaption";
import { useGenerateXhsPosterHtml } from "@/queries/useGenerateXhsPosterHtml";
import { useGeneratePoster } from "@/composables/useGeneratePoster";
import { renderPosterHtmlToBlob } from "@/composables/renderHtmlPoster";
import { useCloudStorage } from "@/composables/useCloudStorage";
import { isWeChatBrowser } from "@/lib/browser-detection";
import { client } from "@/lib/rpc";
import { copyToClipboard } from "@/lib/clipboard";
import {
  TIMING_CONSTANTS,
  delayMs,
  downloadBlob,
  formatCaptionWithUrl,
  generatePosterFilename,
} from "@/features/share/xhs/shareToXiaohongshuUtils";

type Translate = (key: string) => string;

type UseShareToXiaohongshuOptions = {
  prId: PRId;
  shareUrl: string;
  prData: PRShareData;
  t: Translate;
};

type GeneratedCaption = {
  caption: string;
  posterStylePrompt: string;
  posterUrl?: string;
};

const isRemoteUrl = (url: string): boolean =>
  url.startsWith("https://") || url.startsWith("http://");

export const useShareToXiaohongshu = ({
  prId,
  shareUrl,
  prData,
  t,
}: UseShareToXiaohongshuOptions) => {
  const caption = ref<GeneratedCaption | null>(null);
  const posterUrl = ref<string | null>(null);
  const posterIsGenerating = ref(false);
  const posterStylePrompt = ref("");
  const captionCounter = ref(0);
  const generatedCaptions = ref<Map<number, GeneratedCaption>>(new Map());
  const isTransitioning = ref(false);
  const isPosterTransitioning = ref(false);
  const copyState = ref<"idle" | "copied" | "error">("idle");
  const posterGenerationTimeoutId = ref<number | null>(null);

  const { mutateAsync: generateCaptionAsync, isPending: isCaptionGenerating } =
    useGenerateXiaohongshuCaption();
  const { mutateAsync: generatePosterHtmlAsync } = useGenerateXhsPosterHtml();
  const { generatePoster } = useGeneratePoster();
  const { uploadFile } = useCloudStorage();
  const { openXiaohongshu } = useAppScheme();

  const inWeChatBrowser = computed(() => isWeChatBrowser());

  const copyButtonLabel = computed(() => {
    if (copyState.value === "copied") return t("common.copied");
    if (copyState.value === "error") return t("common.copyFailed");
    return t("share.xiaohongshu.copyCaptionButton");
  });

  const downloadButtonLabel = computed(() => {
    if (posterIsGenerating.value) return t("share.xiaohongshu.generating");
    if (inWeChatBrowser.value) return t("share.xiaohongshu.wechatDownloadHint");
    return t("share.xiaohongshu.downloadButton");
  });

  const flashState = (next: "idle" | "copied" | "error"): void => {
    copyState.value = next;
    window.setTimeout(() => {
      copyState.value = "idle";
    }, 2000);
  };

  const generatePosterForCurrentCaption = async (): Promise<void> => {
    const currentCaption = caption.value?.caption;

    if (!currentCaption) {
      posterUrl.value = null;
      return;
    }

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
          prId,
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

      isPosterTransitioning.value = true;

      let nextPosterUrl: string;
      try {
        nextPosterUrl = await uploadFile(blob, "poster.png");
      } catch (uploadError) {
        console.warn("Upload failed, falling back to blob URL:", uploadError);
        nextPosterUrl = URL.createObjectURL(blob);
      }

      posterUrl.value = nextPosterUrl;

      if (isRemoteUrl(nextPosterUrl)) {
        try {
          await client.api.share.xiaohongshu["cache-poster"].$post({
            json: {
              prId,
              caption: currentCaption,
              posterStylePrompt: posterStylePrompt.value,
              posterUrl: nextPosterUrl,
            },
          });
        } catch (cacheError) {
          console.warn("Failed to cache poster URL:", cacheError);
        }
      }

      const entry = generatedCaptions.value.get(captionCounter.value);
      if (entry && entry.caption === currentCaption) {
        entry.posterUrl = nextPosterUrl;
      }

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

  const handleInitializeCaption = async (): Promise<void> => {
    try {
      captionCounter.value = 0;

      if (prData.xiaohongshuPoster) {
        const cached = prData.xiaohongshuPoster;
        const initialCaption: GeneratedCaption = {
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
        prId,
        style: captionCounter.value,
      });
      caption.value = newCaption;
      generatedCaptions.value.set(captionCounter.value, newCaption);
      posterStylePrompt.value = newCaption.posterStylePrompt;

      await generatePosterForCurrentCaption();
    } catch (error) {
      console.error("Failed to initialize caption:", error);
    }
  };

  const handleRegenerate = async (): Promise<void> => {
    try {
      isTransitioning.value = true;

      captionCounter.value += 1;

      let newCaption: GeneratedCaption;
      const cached = generatedCaptions.value.get(captionCounter.value);

      if (cached) {
        newCaption = cached;
      } else {
        newCaption = await generateCaptionAsync({
          prId,
          style: captionCounter.value,
        });
        generatedCaptions.value.set(captionCounter.value, newCaption);
      }

      await delayMs(TIMING_CONSTANTS.CAPTION_TRANSITION_DELAY);
      caption.value = newCaption;
      posterStylePrompt.value = newCaption.posterStylePrompt;
      isTransitioning.value = false;

      await generatePosterForCurrentCaption();
    } catch (error) {
      console.error("Failed to regenerate caption:", error);
      isTransitioning.value = false;
    }
  };

  const handleCaptionUpdate = (event: Event): void => {
    const target = event.target as HTMLTextAreaElement;
    if (!caption.value) return;

    caption.value.caption = target.value;
    posterStylePrompt.value = t("share.xiaohongshu.defaultPosterStylePrompt");
  };

  const handleCaptionBlur = (): void => {
    if (posterGenerationTimeoutId.value !== null) {
      clearTimeout(posterGenerationTimeoutId.value);
    }

    posterGenerationTimeoutId.value = window.setTimeout(() => {
      void generatePosterForCurrentCaption();
    }, 100);
  };

  const handlePosterLoadError = async (): Promise<void> => {
    console.warn("Poster image failed to load, regenerating...");
    posterUrl.value = null;
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 100);
    });
    await generatePosterForCurrentCaption();
  };

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

  const handleCopyCaptionWithUrl = async (): Promise<void> => {
    try {
      const content = formatCaptionWithUrl(caption.value?.caption || "", shareUrl);
      await copyToClipboard(content);
      flashState("copied");
    } catch (error) {
      console.error("Failed to copy:", error);
      flashState("error");
    }
  };

  const handleDownloadPoster = async (): Promise<void> => {
    if (!posterUrl.value) {
      alert(t("share.xiaohongshu.generatePosterFirst"));
      return;
    }

    try {
      const response = await fetch(posterUrl.value);
      const blob = await response.blob();
      downloadBlob(blob, generatePosterFilename());
    } catch (error) {
      console.error("Failed to download poster:", error);
      alert(t("share.xiaohongshu.downloadFailed"));
    }
  };

  const handleOpenApp = (): void => {
    openXiaohongshu();
  };

  onMounted(() => {
    posterStylePrompt.value = t("share.xiaohongshu.defaultPosterStylePrompt");
    void handleInitializeCaption();
  });

  onUnmounted(() => {
    if (posterGenerationTimeoutId.value !== null) {
      clearTimeout(posterGenerationTimeoutId.value);
    }

    if (posterUrl.value?.startsWith("blob:")) {
      URL.revokeObjectURL(posterUrl.value);
    }
  });

  return {
    caption,
    posterUrl,
    posterIsGenerating,
    isCaptionGenerating,
    isTransitioning,
    isPosterTransitioning,
    copyState,
    copyButtonLabel,
    downloadButtonLabel,
    inWeChatBrowser,
    handleRegenerate,
    handleCaptionUpdate,
    handleCaptionBlur,
    handlePosterLoadError,
    handleCopyCaptionWithUrl,
    handleDownloadPoster,
    handleOpenApp,
  };
};

