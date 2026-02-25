import { computed, type ComputedRef } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import type { PRDetailView } from "@/entities/pr/types";
import type { PRShareData } from "@/components/share/types";

type UsePRShareContextOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
};

export const usePRShareContext = ({ id, pr }: UsePRShareContextOptions) => {
  const shareUrl = computed(() => window.location.href);

  const prShareData = computed<PRShareData | null>(() => {
    if (!pr.value) return null;

    return {
      title: pr.value.title,
      type: pr.value.type,
      time: pr.value.time,
      location: pr.value.location,
      minPartners: pr.value.minPartners,
      maxPartners: pr.value.maxPartners,
      partners: pr.value.partners,
      budget: pr.value.budget,
      preferences: pr.value.preferences,
      notes: pr.value.notes,
      rawText: pr.value.rawText,
      xiaohongshuPoster: pr.value.xiaohongshuPoster ?? null,
      wechatThumbnail: pr.value.wechatThumbnail ?? null,
    };
  });

  const canRenderShare = computed(() => id.value !== null && prShareData.value !== null);

  return {
    shareUrl,
    prShareData,
    canRenderShare,
  };
};

