import { HTTPException } from "hono/http-exception";
import { CommunityPRRepository } from "../../../repositories/CommunityPRRepository";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import type { PRId, PRStatus } from "../../../entities/partner-request";
import { resolveUserByOpenId } from "../../pr-core/services/user-resolver.service";
import { toPublicPR } from "../../pr-core/services/pr-view.service";
import { refreshTemporalStatus } from "../../pr-core/temporal-refresh";

const prRepo = new PartnerRequestRepository();
const communityPRRepo = new CommunityPRRepository();

const toIsoString = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;

export type CommunityPRDetail = {
  id: number;
  prKind: "COMMUNITY";
  title?: string;
  rawText: string;
  status: PRStatus;
  createdAt: string;
  createdBy?: string | null;
  core: {
    type: string;
    time: [string | null, string | null];
    location: string | null;
    minPartners: number | null;
    maxPartners: number | null;
    partners: number[];
    myPartnerId: number | null;
    budget: string | null;
    preferences: string[];
    notes: string | null;
  };
  share: {
    xiaohongshuPoster?: {
      caption: string;
      posterStylePrompt: string;
      posterUrl: string;
      createdAt: string;
    } | null;
    wechatThumbnail?: {
      style: number;
      posterUrl: string;
      createdAt: string;
    } | null;
  };
  community: {
    creationSource: "STRUCTURED" | "NATURAL_LANGUAGE" | "LEGACY";
    supportsConfirm: false;
    supportsCheckIn: false;
  };
};

export async function getCommunityPRDetail(
  id: PRId,
  viewerOpenId?: string | null,
): Promise<CommunityPRDetail> {
  const request = await prRepo.findById(id);
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (request.prKind !== "COMMUNITY") {
    throw new HTTPException(404, { message: "Community PR not found" });
  }

  const refreshed = await refreshTemporalStatus(request);
  const viewerUserId = viewerOpenId
    ? (await resolveUserByOpenId(viewerOpenId)).id
    : null;
  const publicPR = await toPublicPR(refreshed, viewerUserId);
  const community = await communityPRRepo.findByPrId(id);
  if (!community) {
    throw new HTTPException(500, {
      message: "Community PR subtype row missing",
    });
  }

  return {
    id: publicPR.id,
    prKind: "COMMUNITY",
    title: publicPR.title,
    rawText: community.rawText,
    status: publicPR.status,
    createdAt: publicPR.createdAt.toISOString(),
    createdBy: publicPR.createdBy ?? undefined,
    core: {
      type: publicPR.type,
      time: publicPR.time,
      location: publicPR.location,
      minPartners: publicPR.minPartners,
      maxPartners: publicPR.maxPartners,
      partners: publicPR.partners,
      myPartnerId: publicPR.myPartnerId,
      budget: community.budget,
      preferences: publicPR.preferences,
      notes: publicPR.notes,
    },
    share: {
      xiaohongshuPoster: publicPR.xiaohongshuPoster
        ? {
            ...publicPR.xiaohongshuPoster,
            createdAt: publicPR.xiaohongshuPoster.createdAt,
          }
        : null,
      wechatThumbnail: publicPR.wechatThumbnail
        ? {
            ...publicPR.wechatThumbnail,
            createdAt: publicPR.wechatThumbnail.createdAt,
          }
        : null,
    },
    community: {
      creationSource: community.creationSource,
      supportsConfirm: false,
      supportsCheckIn: false,
    },
  };
}
