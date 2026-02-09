import type { PartnerRequestFields, PRId } from "@partner-up-dev/backend";

export type XhsPosterSnapshot = {
  caption: string;
  posterStylePrompt: string;
  posterUrl: string;
  createdAt: string;
};

export type WechatThumbnailSnapshot = {
  style: number;
  posterUrl: string;
  createdAt: string;
};

export type PRShareData = PartnerRequestFields & {
  rawText: string;
  xiaohongshuPoster?: XhsPosterSnapshot | null;
  wechatThumbnail?: WechatThumbnailSnapshot | null;
};

export type PRShareProps = {
  shareUrl: string;
  prId: PRId;
  prData: PRShareData;
};
