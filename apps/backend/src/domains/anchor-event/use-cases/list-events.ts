/**
 * Use-case: List all active Anchor Events for the Event Plaza.
 */

import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type { AnchorEvent } from "../../../entities/anchor-event";

const repo = new AnchorEventRepository();

export interface AnchorEventSummary {
  id: number;
  title: string;
  type: string;
  description: string | null;
  coverImage: string | null;
  locationCount: number;
  status: string;
  createdAt: string;
}

function toSummary(e: AnchorEvent): AnchorEventSummary {
  return {
    id: e.id,
    title: e.title,
    type: e.type,
    description: e.description,
    coverImage: e.coverImage,
    locationCount: Array.isArray(e.locationPool) ? e.locationPool.length : 0,
    status: e.status,
    createdAt: e.createdAt.toISOString(),
  };
}

export async function listAnchorEvents(): Promise<AnchorEventSummary[]> {
  const events = await repo.listActive();
  return events.map(toSummary);
}
