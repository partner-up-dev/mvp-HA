import { HTTPException } from "hono/http-exception";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import type {
  AnchorEvent,
  AnchorEventId,
  AnchorEventStatus,
  SystemLocationEntry,
  UserLocationEntry,
} from "../../../entities";
import { assertManualPartnerBoundsValid } from "../../pr-core/services/partner-bounds.service";

const anchorEventRepo = new AnchorEventRepository();

export interface UpdateAdminAnchorEventInput {
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

export async function updateAdminAnchorEvent(
  eventId: AnchorEventId,
  input: UpdateAdminAnchorEventInput,
): Promise<AnchorEvent> {
  assertManualPartnerBoundsValid(
    input.defaultMinPartners,
    input.defaultMaxPartners,
    0,
  );

  const updated = await anchorEventRepo.update(eventId, {
    title: input.title,
    type: input.type,
    description: input.description,
    systemLocationPool: input.systemLocationPool,
    userLocationPool: input.userLocationPool,
    defaultMinPartners: input.defaultMinPartners,
    defaultMaxPartners: input.defaultMaxPartners,
    coverImage: input.coverImage,
    betaGroupQrCode: input.betaGroupQrCode,
    status: input.status,
  });

  if (!updated) {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  return updated;
}
