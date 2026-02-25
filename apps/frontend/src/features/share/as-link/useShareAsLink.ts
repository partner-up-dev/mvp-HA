import { computed, ref } from "vue";
import { copyToClipboard } from "@/lib/clipboard";
import { normalizeUrl } from "@/shared/url/normalizeUrl";
import { trackEvent } from "@/shared/analytics/track";

export type ShareState = "idle" | "sharing" | "shared" | "copied" | "error";

type UseShareAsLinkOptions = {
  shareUrl: () => string;
  getShareFailedText: () => string;
  getLoadingText: () => string;
  getSharedText: () => string;
  getCopiedText: () => string;
  getShareButtonText: () => string;
};

const isShareAbortError = (error: unknown): boolean => {
  if (error instanceof DOMException) {
    return error.name === "AbortError";
  }

  return Boolean(
    typeof error === "object" &&
      error !== null &&
      "name" in error &&
      error.name === "AbortError",
  );
};

export const useShareAsLink = ({
  shareUrl,
  getShareFailedText,
  getLoadingText,
  getSharedText,
  getCopiedText,
  getShareButtonText,
}: UseShareAsLinkOptions) => {
  const shareState = ref<ShareState>("idle");

  const baseHref = computed(() => {
    if (typeof window === "undefined") return "http://localhost/";
    return window.location.href;
  });

  const normalizedUrl = computed(() =>
    normalizeUrl(shareUrl(), baseHref.value),
  );

  const buttonLabel = computed(() => {
    if (shareState.value === "sharing") return getLoadingText();
    if (shareState.value === "shared") return getSharedText();
    if (shareState.value === "copied") return getCopiedText();
    if (shareState.value === "error") return getShareFailedText();
    return getShareButtonText();
  });

  const flashState = (next: ShareState): void => {
    shareState.value = next;
    window.setTimeout(() => {
      shareState.value = "idle";
    }, 2000);
  };

  const getShareData = (): ShareData => {
    const title = typeof document === "undefined" ? undefined : document.title;
    return {
      title,
      url: normalizedUrl.value,
    };
  };

  const tryNativeShare = async (): Promise<boolean> => {
    if (
      typeof navigator === "undefined" ||
      typeof navigator.share !== "function"
    ) {
      return false;
    }
    await navigator.share(getShareData());
    return true;
  };

  const handleShare = async (): Promise<void> => {
    if (shareState.value === "sharing") return;

    shareState.value = "sharing";

    try {
      const didShare = await tryNativeShare();
      if (didShare) {
        trackEvent("share_link_native_success", { url: normalizedUrl.value });
        flashState("shared");
        return;
      }
    } catch (error) {
      if (isShareAbortError(error)) {
        shareState.value = "idle";
        return;
      }
      trackEvent("share_link_failed", {
        url: normalizedUrl.value,
        stage: "native",
      });
      console.error("Native share failed, fallback to copy:", error);
    }

    try {
      await copyToClipboard(normalizedUrl.value);
      trackEvent("share_link_copy_success", { url: normalizedUrl.value });
      flashState("copied");
    } catch (error) {
      trackEvent("share_link_failed", {
        url: normalizedUrl.value,
        stage: "copy",
      });
      console.error("Failed to share/copy:", error);
      flashState("error");
    }
  };

  return {
    shareState,
    normalizedUrl,
    buttonLabel,
    handleShare,
  };
};

