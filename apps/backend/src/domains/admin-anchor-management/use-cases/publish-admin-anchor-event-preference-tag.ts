import { HTTPException } from "hono/http-exception";
import type { AnchorEventId, AnchorEventPreferenceTagId } from "../../../entities";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPreferenceTagRepository } from "../../../repositories/AnchorEventPreferenceTagRepository";
import type { AdminAnchorEventPreferenceTagsResponse } from "./get-admin-anchor-event-preference-tags";

const anchorEventRepo = new AnchorEventRepository();
const preferenceTagRepo = new AnchorEventPreferenceTagRepository();

export async function publishAdminAnchorEventPreferenceTag(input: {
  eventId: AnchorEventId;
  tagId: AnchorEventPreferenceTagId;
}): Promise<AdminAnchorEventPreferenceTagsResponse> {
  const event = await anchorEventRepo.findById(input.eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const tag = await preferenceTagRepo.findById(input.tagId);
  if (!tag || tag.anchorEventId !== event.id) {
    throw new HTTPException(404, { message: "Preference tag not found" });
  }

  await preferenceTagRepo.update(tag.id, { status: "PUBLISHED" });
  const tags = await preferenceTagRepo.findByAnchorEventId(event.id);
  return {
    event: {
      id: event.id,
      title: event.title,
    },
    publishedTags: tags
      .filter((item) => item.status === "PUBLISHED")
      .map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
      })),
    pendingTags: tags
      .filter((item) => item.status === "PENDING")
      .map((item) => ({
        id: item.id,
        label: item.label,
        description: item.description,
      })),
  };
}
