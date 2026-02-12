import { onMounted, toValue, type MaybeRefOrGetter } from "vue";
import { useWeChatShareCard } from "@/composables/useWeChatShareCard";

type UsePageWeChatShareOptions = {
  title: MaybeRefOrGetter<string>;
  desc: MaybeRefOrGetter<string>;
};

const normalizeText = (raw: string): string => raw.replace(/\s+/g, " ").trim();

export const usePageWeChatShare = (options: UsePageWeChatShareOptions) => {
  const { updateWeChatShareCard } = useWeChatShareCard();

  const updatePageWeChatShare = async (): Promise<void> => {
    if (typeof window === "undefined") return;

    try {
      await updateWeChatShareCard({
        title: normalizeText(toValue(options.title)),
        desc: normalizeText(toValue(options.desc)),
        link: window.location.href,
      });
    } catch (error) {
      console.warn("Failed to configure WeChat share card:", error);
    }
  };

  onMounted(() => {
    void updatePageWeChatShare();
  });

  return {
    updatePageWeChatShare,
  };
};
