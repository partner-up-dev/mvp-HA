import type { ParsedPartnerRequest } from "@partner-up-dev/backend";
import type { PRId } from "@partner-up-dev/backend";

export interface ShareToWechatChatProps {
  shareUrl: string;
  rawText: string;
  prId: PRId;
  prData: ParsedPartnerRequest & {
    wechatThumbnail?: {
      style: number;
      posterUrl: string;
      createdAt: string;
    } | null;
  };
}
