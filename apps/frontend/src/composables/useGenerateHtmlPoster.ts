import { computed, ref } from "vue";
import { client } from "@/lib/rpc";
import { isWeChatBrowser } from "@/lib/browser-detection";
import type { PosterRatio, PosterStyle } from "@partner-up-dev/backend";

export const useGenerateHtmlPoster = () => {
  const isGenerating = ref(false);
  const posterUrl = ref<string | null>(null);

  const generatePoster = async (
    caption: string,
    style: PosterStyle,
    ratio: PosterRatio = "3:4",
    saveOnServer?: boolean,
  ): Promise<string> => {
    isGenerating.value = true;

    try {
      const shouldSave = saveOnServer ?? isWeChatBrowser();
      const res = await client.api.poster.generate.$post({
        json: {
          caption,
          style,
          ratio,
          saveOnServer: shouldSave,
        },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error ?? "Poster generation failed");
      }

      const data = (await res.json()) as {
        posterUrl: string;
        saved: boolean;
      };

      posterUrl.value = data.posterUrl;
      return data.posterUrl;
    } finally {
      isGenerating.value = false;
    }
  };

  const downloadPoster = async (
    url: string,
    filename = "poster.png",
  ): Promise<void> => {
    if (url.startsWith("data:")) {
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error("Failed to download poster");
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  };

  return {
    generatePoster,
    downloadPoster,
    isGenerating: computed(() => isGenerating.value),
    posterUrl: computed(() => posterUrl.value),
  };
};
