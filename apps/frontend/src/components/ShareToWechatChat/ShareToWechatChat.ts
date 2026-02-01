import type { ParsedPartnerRequest } from "@partner-up-dev/backend";

export interface ShareToWechatChatProps {
  shareUrl: string;
  rawText: string;
  prData: ParsedPartnerRequest;
}

