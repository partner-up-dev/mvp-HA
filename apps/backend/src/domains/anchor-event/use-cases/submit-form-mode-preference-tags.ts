import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventPreferenceTagRepository } from "../../../repositories/AnchorEventPreferenceTagRepository";
import type { AnchorEventId } from "../../../entities";
import {
  buildAnchorEventPreferenceTagKey,
  normalizeAnchorEventPreferenceTagDescription,
  normalizeAnchorEventPreferenceTagLabel,
} from "../services/preference-tags";

const anchorEventRepo = new AnchorEventRepository();
const preferenceTagRepo = new AnchorEventPreferenceTagRepository();

export interface SubmitAnchorEventFormModePreferenceTagsResponse {
  event: {
    id: number;
    title: string;
  };
  tags: Array<{
    id: number;
    label: string;
    description: string;
    status: "PUBLISHED" | "PENDING" | "REJECTED";
  }>;
}

export async function submitAnchorEventFormModePreferenceTags(
  eventId: AnchorEventId,
  labels: string[],
): Promise<SubmitAnchorEventFormModePreferenceTagsResponse> {
  const event = await anchorEventRepo.findById(eventId);
  if (!event) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const normalizedLabels = Array.from(
    new Map(
      labels
        .map((label) => normalizeAnchorEventPreferenceTagLabel(label))
        .filter((label) => label.length > 0)
        .map((label) => [buildAnchorEventPreferenceTagKey(label), label] as const),
    ).values(),
  );

  if (normalizedLabels.length === 0) {
    return {
      event: {
        id: event.id,
        title: event.title,
      },
      tags: [],
    };
  }

  const existingTags = await preferenceTagRepo.findByAnchorEventId(eventId);
  const existingByKey = new Map(
    existingTags.map((tag) => [buildAnchorEventPreferenceTagKey(tag.label), tag]),
  );

  const resolvedTags = [];
  for (const label of normalizedLabels) {
    const existing = existingByKey.get(buildAnchorEventPreferenceTagKey(label));
    if (!existing) {
      const created = await preferenceTagRepo.create({
        anchorEventId: eventId,
        label,
        description: normalizeAnchorEventPreferenceTagDescription(""),
        status: "PENDING",
      });
      existingByKey.set(buildAnchorEventPreferenceTagKey(label), created);
      resolvedTags.push(created);
      continue;
    }

    if (existing.status === "REJECTED") {
      const reopened = await preferenceTagRepo.update(existing.id, {
        label,
        status: "PENDING",
      });
      if (reopened) {
        existingByKey.set(buildAnchorEventPreferenceTagKey(label), reopened);
        resolvedTags.push(reopened);
        continue;
      }
    }

    resolvedTags.push(existing);
  }

  return {
    event: {
      id: event.id,
      title: event.title,
    },
    tags: resolvedTags.map((tag) => ({
      id: tag.id,
      label: tag.label,
      description: tag.description,
      status: tag.status,
    })),
  };
}
