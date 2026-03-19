import type { PRId } from "@partner-up-dev/backend";
import type { PRFormFields } from "@/domains/pr/model/types";
import type { ShareSpmRouteKey } from "@/shared/url/spm";

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

export type PRShareData = PRFormFields & {
  rawText?: string | null;
  xiaohongshuPoster?: XhsPosterSnapshot | null;
  wechatThumbnail?: WechatThumbnailSnapshot | null;
};

export type PRShareProps = {
  shareUrl: string;
  spmRouteKey: ShareSpmRouteKey;
  prId: PRId;
  prData: PRShareData;
};
