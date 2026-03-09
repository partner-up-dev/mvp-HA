import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventStatus,
  LocationEntry,
} from "../../../entities";

const anchorEventRepo = new AnchorEventRepository();

export interface CreateAdminAnchorEventInput {
  title: string;
  type: string;
  description: string | null;
  locationPool: LocationEntry[];
  coverImage: string | null;
  status: AnchorEventStatus;
}

export async function createAdminAnchorEvent(
  input: CreateAdminAnchorEventInput,
): Promise<AnchorEvent> {
  return await anchorEventRepo.create({
    title: input.title,
    type: input.type,
    description: input.description,
    locationPool: input.locationPool,
    timeWindowPool: [],
    coverImage: input.coverImage,
    status: input.status,
  });
}
