import bcrypt from "bcryptjs";
import { HTTPException } from "hono/http-exception";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { resolveDesiredSlotCount } from "../services/slot-management.service";
import type { PRId } from "../../../entities/partner-request";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { db } from "../../../lib/db";
import { anchorEventBatches } from "../../../entities/anchor-event-batch";
import { partnerRequests } from "../../../entities/partner-request";
import { partners } from "../../../entities/partner";
import { and, eq } from "drizzle-orm";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();

const windowsEqual = (
  a: [string | null, string | null],
  b: [string | null, string | null],
): boolean => a[0] === b[0] && a[1] === b[1];

const hasJoinableStatus = (status: string): boolean =>
  status === "OPEN" || status === "READY";

const generateSystemPin = (): string => {
  const value = Math.floor(1000 + Math.random() * 9000);
  return String(value);
};

export interface AcceptAlternativeBatchResult {
  batchId: number;
  prId: number;
  createdBatch: boolean;
  createdPr: boolean;
}

export async function acceptAlternativeBatch(
  sourcePrId: PRId,
  targetTimeWindow: [string | null, string | null],
): Promise<AcceptAlternativeBatchResult> {
  const source = await prRepo.findById(sourcePrId);
  if (!source) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (
    source.prKind !== "ANCHOR" ||
    source.anchorEventId === null ||
    source.batchId === null
  ) {
    throw new HTTPException(400, {
      message: "Alternative batch accept is only available for anchor PR",
    });
  }
  if (!source.location) {
    throw new HTTPException(400, {
      message: "Current anchor PR has no location",
    });
  }
  const sourceLocation = source.location;

  const sourceBatch = await batchRepo.findById(source.batchId);
  if (!sourceBatch) {
    throw new HTTPException(404, { message: "Source batch not found" });
  }
  if (windowsEqual(sourceBatch.timeWindow, targetTimeWindow)) {
    throw new HTTPException(400, {
      message: "Target batch must use a different time window",
    });
  }

  const event = await anchorEventRepo.findById(source.anchorEventId);
  if (!event || event.status !== "ACTIVE") {
    throw new HTTPException(404, { message: "Anchor event not found" });
  }

  const isWindowInPool = (event.timeWindowPool ?? []).some((window) =>
    windowsEqual(window, targetTimeWindow),
  );
  if (!isWindowInPool) {
    throw new HTTPException(400, {
      message: "Target time window is not available in this anchor event",
    });
  }

  const txResult = await db.transaction(async (tx) => {
    const batchRows = await tx
      .select()
      .from(anchorEventBatches)
      .where(eq(anchorEventBatches.anchorEventId, source.anchorEventId!));
    let targetBatch = batchRows.find((batch) =>
      windowsEqual(batch.timeWindow, targetTimeWindow),
    );

    let createdBatch = false;
    if (!targetBatch) {
      const insertedBatch = await tx
        .insert(anchorEventBatches)
        .values({
          anchorEventId: source.anchorEventId!,
          timeWindow: targetTimeWindow,
          status: "OPEN",
        })
        .returning();
      targetBatch = insertedBatch[0];
      createdBatch = true;
    }

    const existingPRs = await tx
      .select()
      .from(partnerRequests)
      .where(
        and(
          eq(partnerRequests.batchId, targetBatch.id),
          eq(partnerRequests.location, sourceLocation),
          eq(partnerRequests.visibilityStatus, "VISIBLE"),
        ),
      );
    let targetPR = existingPRs.find((pr) => hasJoinableStatus(pr.status));

    let createdPr = false;
    if (!targetPR) {
      const pinHash = await bcrypt.hash(generateSystemPin(), 10);
      const insertedPR = await tx
        .insert(partnerRequests)
        .values({
          rawText: source.rawText,
          title: source.title,
          type: source.type,
          time: targetTimeWindow,
          location: sourceLocation,
          status: "OPEN",
          pinHash,
          minPartners: source.minPartners,
          maxPartners: source.maxPartners,
          budget: source.budget,
          preferences: source.preferences,
          notes: source.notes,
          prKind: "ANCHOR",
          anchorEventId: source.anchorEventId,
          batchId: targetBatch.id,
          visibilityStatus: "VISIBLE",
          autoHideAt: source.autoHideAt,
        })
        .returning();
      targetPR = insertedPR[0];

      const slotCount = resolveDesiredSlotCount(
        targetPR.minPartners,
        targetPR.maxPartners,
      );
      if (slotCount > 0) {
        const now = new Date();
        const rows: Array<typeof partners.$inferInsert> = Array.from(
          { length: slotCount },
          () => ({
            prId: targetPR!.id,
            userId: null,
            status: "RELEASED",
            releasedAt: now,
          }),
        );
        await tx.insert(partners).values(rows);
      }

      createdPr = true;
    }

    return {
      targetBatch,
      targetPR,
      createdBatch,
      createdPr,
    };
  });

  const eventRecord = await eventBus.publish(
    "anchor.pr.auto_created",
    "partner_request",
    String(txResult.targetPR.id),
    {
      sourcePrId,
      createdPrId: txResult.targetPR.id,
      anchorEventId: txResult.targetPR.anchorEventId,
      batchId: txResult.targetPR.batchId,
      location: txResult.targetPR.location,
      activeCountAtSource: 0,
    },
  );
  void writeToOutbox(eventRecord);

  operationLogService.log({
    actorId: null,
    action: "anchor.batch.accept_recommendation",
    aggregateType: "partner_request",
    aggregateId: String(txResult.targetPR.id),
    detail: {
      sourcePrId,
      targetBatchId: txResult.targetBatch.id,
      targetPrId: txResult.targetPR.id,
      createdBatch: txResult.createdBatch,
      createdPr: txResult.createdPr,
    },
  });

  return {
    batchId: txResult.targetBatch.id,
    prId: txResult.targetPR.id,
    createdBatch: txResult.createdBatch,
    createdPr: txResult.createdPr,
  };
}
