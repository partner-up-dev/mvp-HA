import { HTTPException } from "hono/http-exception";
import { and, eq } from "drizzle-orm";
import { PartnerRequestRepository } from "../../../repositories/PartnerRequestRepository";
import { AnchorEventRepository } from "../../../repositories/AnchorEventRepository";
import { AnchorEventBatchRepository } from "../../../repositories/AnchorEventBatchRepository";
import { AnchorPRRepository } from "../../../repositories/AnchorPRRepository";
import { resolveDesiredSlotCount } from "../services/slot-management.service";
import type { PRId } from "../../../entities/partner-request";
import { eventBus, writeToOutbox } from "../../../infra/events";
import { operationLogService } from "../../../infra/operation-log";
import { db } from "../../../lib/db";
import { anchorEventBatches } from "../../../entities/anchor-event-batch";
import { anchorPartnerRequests } from "../../../entities/anchor-partner-request";
import { partnerRequests } from "../../../entities/partner-request";
import { partners } from "../../../entities/partner";
import { materializePRSupportResources } from "../../pr-booking-support";

const prRepo = new PartnerRequestRepository();
const anchorEventRepo = new AnchorEventRepository();
const batchRepo = new AnchorEventBatchRepository();
const anchorPRRepo = new AnchorPRRepository();

const windowsEqual = (
  a: [string | null, string | null],
  b: [string | null, string | null],
): boolean => a[0] === b[0] && a[1] === b[1];

const hasJoinableStatus = (status: string): boolean =>
  status === "OPEN" || status === "READY";

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
  const sourceRequest = await prRepo.findById(sourcePrId);
  if (!sourceRequest) {
    throw new HTTPException(404, { message: "Partner request not found" });
  }
  if (sourceRequest.prKind !== "ANCHOR") {
    throw new HTTPException(400, {
      message: "Alternative batch accept is only available for anchor PR",
    });
  }

  const sourceRecord = await anchorPRRepo.findRecordByPrId(sourcePrId);
  if (!sourceRecord) {
    throw new HTTPException(500, {
      message: "Anchor PR subtype row missing",
    });
  }

  const source = sourceRecord.root;
  const sourceAnchor = sourceRecord.anchor;
  if (!source.location) {
    throw new HTTPException(400, {
      message: "Current anchor PR has no location",
    });
  }
  const sourceLocation = source.location;
  const sourceAnchorEventId = sourceAnchor.anchorEventId;
  const sourceBatchId = sourceAnchor.batchId;

  const sourceBatch = await batchRepo.findById(sourceBatchId);
  if (!sourceBatch) {
    throw new HTTPException(404, { message: "Source batch not found" });
  }
  if (windowsEqual(sourceBatch.timeWindow, targetTimeWindow)) {
    throw new HTTPException(400, {
      message: "Target batch must use a different time window",
    });
  }

  const event = await anchorEventRepo.findById(sourceAnchorEventId);
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
      .where(eq(anchorEventBatches.anchorEventId, sourceAnchorEventId));
    let targetBatch = batchRows.find((batch) =>
      windowsEqual(batch.timeWindow, targetTimeWindow),
    );

    let createdBatch = false;
    if (!targetBatch) {
      const insertedBatch = await tx
        .insert(anchorEventBatches)
        .values({
          anchorEventId: sourceAnchorEventId,
          timeWindow: targetTimeWindow,
          status: "OPEN",
        })
        .returning();
      targetBatch = insertedBatch[0];
      createdBatch = true;
    }

    const existingPRs = await tx
      .select({
        root: partnerRequests,
        anchor: anchorPartnerRequests,
      })
      .from(anchorPartnerRequests)
      .innerJoin(
        partnerRequests,
        eq(partnerRequests.id, anchorPartnerRequests.prId),
      )
      .where(
        and(
          eq(anchorPartnerRequests.batchId, targetBatch.id),
          eq(partnerRequests.location, sourceLocation),
          eq(anchorPartnerRequests.visibilityStatus, "VISIBLE"),
        ),
      );
    let targetPRRecord = existingPRs.find((record) =>
      hasJoinableStatus(record.root.status),
    );

    let createdPr = false;
    if (!targetPRRecord) {
      const insertedRoot = await tx
        .insert(partnerRequests)
        .values({
          title: source.title,
          type: source.type,
          time: targetTimeWindow,
          location: sourceLocation,
          status: "OPEN",
          minPartners: source.minPartners,
          maxPartners: source.maxPartners,
          preferences: source.preferences,
          notes: source.notes,
          prKind: "ANCHOR",
        })
        .returning();
      const insertedAnchor = await tx
        .insert(anchorPartnerRequests)
        .values({
          prId: insertedRoot[0].id,
          anchorEventId: sourceAnchorEventId,
          batchId: targetBatch.id,
          locationSource: "SYSTEM",
          visibilityStatus: "VISIBLE",
          autoHideAt: sourceAnchor.autoHideAt,
        })
        .returning();
      targetPRRecord = {
        root: insertedRoot[0],
        anchor: insertedAnchor[0],
      };
      const targetRoot = insertedRoot[0];

      const slotCount = resolveDesiredSlotCount(
        targetRoot.minPartners,
        targetRoot.maxPartners,
      );
      if (slotCount > 0) {
        const now = new Date();
        const rows: Array<typeof partners.$inferInsert> = Array.from(
          { length: slotCount },
          () => ({
            prId: targetRoot.id,
            userId: null,
            status: "RELEASED",
            releasedAt: now,
          }),
        );
        await tx.insert(partners).values(rows);
      }

      createdPr = true;
    }
    if (!targetPRRecord) {
      throw new HTTPException(500, {
        message: "Failed to resolve target anchor PR",
      });
    }

    return {
      targetBatch,
      targetPR: targetPRRecord.root,
      targetAnchor: targetPRRecord.anchor,
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
      anchorEventId: txResult.targetAnchor.anchorEventId,
      batchId: txResult.targetAnchor.batchId,
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

  await materializePRSupportResources({
    prId: txResult.targetPR.id,
    anchorEventId: txResult.targetAnchor.anchorEventId,
    batchId: txResult.targetAnchor.batchId,
    location: txResult.targetPR.location,
    timeWindow: txResult.targetPR.time,
  });

  return {
    batchId: txResult.targetBatch.id,
    prId: txResult.targetPR.id,
    createdBatch: txResult.createdBatch,
    createdPr: txResult.createdPr,
  };
}
