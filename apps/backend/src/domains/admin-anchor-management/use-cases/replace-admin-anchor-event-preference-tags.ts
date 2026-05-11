import { HTTPException } from "hono/http-exception";
import type { AnchorEventId } from "../../../entities";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPreferenceTagRepository } from "../../../repositories/AnchorEventPreferenceTagRepository";
import {
  buildAnchorEventPreferenceTagKey,
  normalizeAnchorEventPreferenceTagDescription,
  normalizeAnchorEventPreferenceTagLabel,
} from "../../anchor-event/services/preference-tags";
import type { AdminAnchorEventPreferenceTagsResponse } from "./get-admin-anchor-event-preference-tags";

const anchorEventRepo = new AnchorEventRepository();
const preferenceTagRepo = new AnchorEventPreferenceTagRepository();

type PreferenceTagInput = {
  label: string;
  description: string | null;
};

export async function replaceAdminAnchorEventPreferenceTags(
  eventId: AnchorEventId,
  input: PreferenceTagInput[],
): Promise<AdminAnchorEventPreferenceTagsResponse> {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const normalizedInput = Array.from(
    new Map(
      input
        .map((tag) => ({
          label: normalizeAnchorEventPreferenceTagLabel(tag.label),
          description: normalizeAnchorEventPreferenceTagDescription(
            tag.description,
          ),
        }))
        .filter((tag) => tag.label.length > 0)
        .map((tag) => [buildAnchorEventPreferenceTagKey(tag.label), tag] as const),
    ).values(),
  );

  const existingTags = await preferenceTagRepo.findByAnchorEventId(eventId);
  const existingByKey = new Map(
    existingTags.map((tag) => [buildAnchorEventPreferenceTagKey(tag.label), tag]),
  );
  const desiredKeys = new Set(
    normalizedInput.map((tag) => buildAnchorEventPreferenceTagKey(tag.label)),
  );

  for (const tag of normalizedInput) {
    const existing = existingByKey.get(buildAnchorEventPreferenceTagKey(tag.label));
    if (existing) {
      await preferenceTagRepo.update(existing.id, {
        label: tag.label,
        description: tag.description,
        status: "PUBLISHED",
      });
      continue;
    }

    await preferenceTagRepo.create({
      anchorEventId: event.id,
      label: tag.label,
      description: tag.description,
      status: "PUBLISHED",
    });
  }

  for (const existing of existingTags) {
    const key = buildAnchorEventPreferenceTagKey(existing.label);
    if (existing.status === "PUBLISHED" && !desiredKeys.has(key)) {
      await preferenceTagRepo.update(existing.id, {
        status: "REJECTED",
      });
    }
  }

  const nextTags = await preferenceTagRepo.findByAnchorEventId(eventId);
  return {
    event: {
      id: event.id,
      title: event.title,
    },
    publishedTags: nextTags
      .filter((tag) => tag.status === "PUBLISHED")
      .map((tag) => ({
        id: tag.id,
        label: tag.label,
        description: tag.description,
      })),
    pendingTags: nextTags
      .filter((tag) => tag.status === "PENDING")
      .map((tag) => ({
        id: tag.id,
        label: tag.label,
        description: tag.description,
      })),
  };
}
