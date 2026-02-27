import type { PRStatus } from "@partner-up-dev/backend";

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

export type PRDetailView = {
  id: number;
  rawText: string;
  type: string;
  time: [string | null, string | null];
  location: string | null;
  status: PRStatus;
  minPartners: number | null;
  maxPartners: number | null;
  createdAt: string;
  budget: string | null;
  preferences: string[];
  notes: string | null;
  prKind?: "ANCHOR" | "COMMUNITY";
  anchorEventId?: number | null;
  batchId?: number | null;
  visibilityStatus?: "VISIBLE" | "HIDDEN";
  autoHideAt?: string | null;
  partners: number[];
  myPartnerId: number | null;
  title?: string;
  xiaohongshuPoster?: XhsPosterSnapshot | null;
  wechatThumbnail?: WechatThumbnailSnapshot | null;
};
