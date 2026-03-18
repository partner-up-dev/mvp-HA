import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventStatus,
  SystemLocationEntry,
  UserLocationEntry,
} from "../../../entities";

const anchorEventRepo = new AnchorEventRepository();

export interface CreateAdminAnchorEventInput {
  title: string;
  type: string;
  description: string | null;
  systemLocationPool: SystemLocationEntry[];
  userLocationPool: UserLocationEntry[];
  defaultMinPartners: number | null;
  defaultMaxPartners: number | null;
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
    systemLocationPool: input.systemLocationPool,
    userLocationPool: input.userLocationPool,
    timeWindowPool: [],
    defaultMinPartners: input.defaultMinPartners,
    defaultMaxPartners: input.defaultMaxPartners,
    coverImage: input.coverImage,
    status: input.status,
  });
}
