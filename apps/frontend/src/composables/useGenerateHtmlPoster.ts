import { computed, ref } from "vue";
import { client } from "@/lib/rpc";
import type { PosterRatio } from "@partner-up-dev/backend";

const isWeChatBrowser = (): boolean =>
  /MicroMessenger/i.test(navigator.userAgent);

export const useGenerateHtmlPoster = () => {
  const isGenerating = ref(false);
  const posterUrl = ref<string | null>(null);

  const generatePoster = async (
    caption: string,
    style: number,
    ratio: PosterRatio = "3:4",
    saveOnServer?: boolean,
  ) => {
    isGenerating.value = true;

    try {
      const shouldSave = saveOnServer ?? isWeChatBrowser();
      const res = await client.api.poster.html.$post({
        json: {
          caption,
          style,
          ratio,
          saveOnServer: shouldSave,
        },
      });

      if (!res.ok) {
        throw new Error("Poster generation failed");
      }

      const data = await res.json();
      posterUrl.value = data.posterUrl;
      return data;
    } finally {
      isGenerating.value = false;
    }
  };

  const clearPoster = () => {
    posterUrl.value = null;
  };

  return {
    generatePoster,
    clearPoster,
    isGenerating: computed(() => isGenerating.value),
    posterUrl: computed(() => posterUrl.value),
    isWeChatBrowser,
  };
};
