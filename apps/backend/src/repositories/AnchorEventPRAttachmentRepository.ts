import { eq } from "drizzle-orm";
import { db } from "../lib/db";
import {
  anchorEventPRAttachments,
  type AnchorEventId,
  type AnchorEventPRAttachment,
  type PRId,
} from "../entities";

export class AnchorEventPRAttachmentRepository {
  async findByPrId(prId: PRId): Promise<AnchorEventPRAttachment | null> {
    const result = await db
      .select()
      .from(anchorEventPRAttachments)
      .where(eq(anchorEventPRAttachments.prId, prId));
    return result[0] ?? null;
  }

  async upsertByPrId(input: {
    prId: PRId;
    anchorEventId: AnchorEventId;
  }): Promise<AnchorEventPRAttachment> {
    const result = await db
      .insert(anchorEventPRAttachments)
      .values(input)
      .onConflictDoUpdate({
        target: anchorEventPRAttachments.prId,
        set: {
          anchorEventId: input.anchorEventId,
        },
      })
      .returning();
    return result[0]!;
  }
}
