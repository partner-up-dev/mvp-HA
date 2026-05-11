import { HTTPException } from "hono/http-exception";
import type { PRId } from "../../../entities/partner-request";
import type { PRMessageId } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import { PRMessageInboxStateRepository } from "../../../repositories/PRMessageInboxStateRepository";
import { PRMessageRepository } from "../../../repositories/PRMessageRepository";
import { requirePRMessageParticipantAccess } from "../../pr-core/services/pr-message-access.service";
import { buildPRMessageThreadState } from "../../pr-core/services/pr-message-thread.service";

const messageRepo = new PRMessageRepository();
const inboxStateRepo = new PRMessageInboxStateRepository();

export async function advancePRMessageReadMarker(input: {
  prId: PRId;
  userId: UserId;
  lastReadMessageId: PRMessageId;
}) {
  const { prId, userId, lastReadMessageId } = input;
  await requirePRMessageParticipantAccess(prId, userId);

  const targetMessage = await messageRepo.findByPrIdAndId(prId, lastReadMessageId);
  if (!targetMessage) {
    throw new HTTPException(400, {
      message: "Read marker must point to an existing message in this PR",
    });
  }

  const [inboxState, latestVisibleMessageId] = await Promise.all([
    inboxStateRepo.upsertLastReadMessageId(prId, userId, lastReadMessageId),
    messageRepo.findLatestIdByPrId(prId),
  ]);

  return {
    ok: true,
    thread: buildPRMessageThreadState(latestVisibleMessageId, inboxState),
  };
}
