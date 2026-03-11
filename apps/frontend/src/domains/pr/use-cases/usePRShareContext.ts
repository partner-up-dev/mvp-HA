import { computed, type ComputedRef } from "vue";
import type { PRId } from "@partner-up-dev/backend";
import { isCommunityPRDetail, type PRDetailView } from "@/domains/pr/model/types";
import type { PRShareData } from "@/domains/share/model/types";

type UsePRShareContextOptions = {
  id: ComputedRef<PRId | null>;
  pr: ComputedRef<PRDetailView | undefined>;
};

export const usePRShareContext = ({ id, pr }: UsePRShareContextOptions) => {
  const shareUrl = computed(() => window.location.href);

  const prShareData = computed<PRShareData | null>(() => {
    if (!pr.value) return null;

    const sharedFields = {
      title: pr.value.title,
      type: pr.value.core.type,
      time: pr.value.core.time,
      location: pr.value.core.location,
      minPartners: pr.value.core.minPartners,
      maxPartners: pr.value.core.maxPartners,
      partners: pr.value.core.partners,
      preferences: pr.value.core.preferences,
      notes: pr.value.core.notes,
      xiaohongshuPoster: pr.value.share.xiaohongshuPoster ?? null,
      wechatThumbnail: pr.value.share.wechatThumbnail ?? null,
    };

    if (isCommunityPRDetail(pr.value)) {
      return {
        ...sharedFields,
        budget: pr.value.core.budget,
        rawText: pr.value.rawText,
      };
    }

    return sharedFields;
  });

  const canRenderShare = computed(
    () => id.value !== null && prShareData.value !== null,
  );

  return {
    shareUrl,
    prShareData,
    canRenderShare,
  };
};
