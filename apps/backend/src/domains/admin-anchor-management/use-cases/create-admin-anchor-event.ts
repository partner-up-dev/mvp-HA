import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventStatus,
  SystemLocationEntry,
  UserLocationEntry,
} from "../../../entities";
import { assertManualPartnerBoundsValid } from "../../pr/services";

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
  betaGroupQrCode: string | null;
  status: AnchorEventStatus;
}

export async function createAdminAnchorEvent(
  input: CreateAdminAnchorEventInput,
): Promise<AnchorEvent> {
  assertManualPartnerBoundsValid(
    input.defaultMinPartners,
    input.defaultMaxPartners,
    0,
  );

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
    betaGroupQrCode: input.betaGroupQrCode,
    status: input.status,
  });
}
