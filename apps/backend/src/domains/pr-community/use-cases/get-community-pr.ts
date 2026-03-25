import { HTTPException } from "hono/http-exception";
import { CommunityPRRepository } from "../../../repositories/CommunityPRRepository";
import { PartnerRepository } from "../../../repositories/PartnerRepository";
import type { PRId, PRStatus } from "../../../entities/partner-request";
import type { UserId } from "../../../entities/user";
import { resolveUserByOpenId } from "../../pr-core/services/user-resolver.service";
import { toPublicPR } from "../../pr-core/services/pr-view.service";
import { buildCommunityPartnerSection, type PartnerSectionView } from "../../pr-core/services/partner-section-view.service";
import { readPartnerRequestById } from "../../pr-core/services/pr-read.service";

const communityPRRepo = new CommunityPRRepository();
const partnerRepo = new PartnerRepository();

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
  partnerSection: PartnerSectionView;
};

export async function getCommunityPRDetail(
  id: PRId,
  viewerIdentity?: {
    userId?: UserId | null;
    openId?: string | null;
  },
): Promise<CommunityPRDetail> {
  const request = await readPartnerRequestById(id, {
    consistency: "strong",
  });
  if (!request) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (request.prKind !== "COMMUNITY") {
    throw new HTTPException(404, { message: "Community PR not found" });
  }

  const viewerUserId =
    viewerIdentity?.userId ??
    (viewerIdentity?.openId
      ? (await resolveUserByOpenId(viewerIdentity.openId)).id
      : null);
  const publicPR = await toPublicPR(request, viewerUserId);
  const community = await communityPRRepo.findByPrId(id);
  if (!community) {
    throw new HTTPException(500, {
      message: "Community PR subtype row missing",
    });
  }
  const activeParticipants = await partnerRepo.listActiveParticipantSummariesByPrId(
    id,
  );

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
    partnerSection: buildCommunityPartnerSection(
      publicPR,
      activeParticipants,
      viewerUserId,
    ),
  };
}
