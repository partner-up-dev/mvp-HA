import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type { PRId } from "@partner-up-dev/backend";

export interface ShareToWechatChatProps {
  shareUrl: string;
  rawText: string;
  prId: PRId;
  prData: PartnerRequestFields & {
    wechatThumbnail?: {
      style: number;
      posterUrl: string;
      createdAt: string;
    } | null;
  };
}
