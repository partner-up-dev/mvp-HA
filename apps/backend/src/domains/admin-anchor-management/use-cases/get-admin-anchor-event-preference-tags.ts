import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPreferenceTagRepository } from "../../../repositories/AnchorEventPreferenceTagRepository";
import type { AnchorEventId } from "../../../entities";

const anchorEventRepo = new AnchorEventRepository();
const preferenceTagRepo = new AnchorEventPreferenceTagRepository();

export interface AdminAnchorEventPreferenceTagsResponse {
  event: {
    id: number;
    title: string;
  };
  publishedTags: Array<{
    id: number;
    label: string;
    description: string;
  }>;
  pendingTags: Array<{
    id: number;
    label: string;
    description: string;
  }>;
}

export async function getAdminAnchorEventPreferenceTags(
  eventId: AnchorEventId,
): Promise<AdminAnchorEventPreferenceTagsResponse> {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const tags = await preferenceTagRepo.findByAnchorEventId(eventId);
  return {
    event: {
      id: event.id,
      title: event.title,
    },
    publishedTags: tags
      .filter((tag) => tag.status === "PUBLISHED")
      .map((tag) => ({
        id: tag.id,
        label: tag.label,
        description: tag.description,
      })),
    pendingTags: tags
      .filter((tag) => tag.status === "PENDING")
      .map((tag) => ({
        id: tag.id,
        label: tag.label,
        description: tag.description,
      })),
  };
}
