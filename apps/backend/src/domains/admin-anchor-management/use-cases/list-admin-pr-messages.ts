import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { toPRMessageThreadItem } from "../../pr-core/services/pr-message-thread.service";

const prRepo = new PartnerRequestRepository();
const messageRepo = new PRMessageRepository();

export type AdminPRMessageItem = ReturnType<typeof toPRMessageThreadItem> & {
  updatedAt: string;
};

export type AdminPRMessageListResponse = {
  items: AdminPRMessageItem[];
};

export async function listAdminPRMessages(
  prId: PRId,
): Promise<AdminPRMessageListResponse> {
  const request = await prRepo.findById(prId);
  if (!request) {
    throw new HTTPException(404, { message: "PR not found" });
  }

  const messages = await messageRepo.listByPrId(prId);
  return {
    items: messages.map((message) => ({
      ...toPRMessageThreadItem(message),
      updatedAt: message.updatedAt.toISOString(),
    })),
  };
}
