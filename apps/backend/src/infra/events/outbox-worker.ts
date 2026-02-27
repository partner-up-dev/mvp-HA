/**
 * Outbox worker – polls `outbox_events` for PENDING rows, dispatches them
 * to registered handlers, and marks them as COMPLETED or FAILED.
 *
 * In this MVP implementation the worker runs as an in-process poller.
 * Handlers are registered via `registerOutboxHandler`.
 */

import { db } from "../../lib/db";
import { outboxEvents } from "../../entities/outbox-event";
import { domainEvents } from "../../entities/domain-event";
import { eq, asc, and } from "drizzle-orm";
import type { DomainEventType } from "./event-types";

// ---------------------------------------------------------------------------
// Handler registry
// ---------------------------------------------------------------------------

type OutboxHandler = (event: {
  type: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  occurredAt: Date;
}) => Promise<void>;

const handlers: OutboxHandler[] = [];

/** Register a handler that will be invoked for every outbox event. */
export function registerOutboxHandler(handler: OutboxHandler): void {
  handlers.push(handler);
}

// ---------------------------------------------------------------------------
// Worker loop
// ---------------------------------------------------------------------------

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

/**
 * Process one batch of pending outbox events.
 * Returns the number of events processed in this tick.
 */
export async function processOutboxBatch(): Promise<number> {
  // Fetch pending outbox events (oldest first)
  const pending = await db
    .select({
      outboxId: outboxEvents.id,
      eventId: outboxEvents.eventId,
      attempts: outboxEvents.attempts,
      type: domainEvents.type,
      aggregateType: domainEvents.aggregateType,
      aggregateId: domainEvents.aggregateId,
      payload: domainEvents.payload,
      occurredAt: domainEvents.occurredAt,
    })
    .from(outboxEvents)
    .innerJoin(domainEvents, eq(outboxEvents.eventId, domainEvents.id))
    .where(and(eq(outboxEvents.status, "PENDING")))
    .orderBy(asc(outboxEvents.id))
    .limit(BATCH_SIZE);

  let processed = 0;

  for (const row of pending) {
    const now = new Date();

    // Mark as processing
    await db
      .update(outboxEvents)
      .set({
        status: "PROCESSING",
        lastAttemptedAt: now,
        attempts: row.attempts + 1,
      })
      .where(eq(outboxEvents.id, row.outboxId));

    try {
      for (const handler of handlers) {
        await handler({
          type: row.type as DomainEventType,
          aggregateType: row.aggregateType,
          aggregateId: row.aggregateId,
          payload: row.payload as Record<string, unknown>,
          occurredAt: row.occurredAt,
        });
      }

      await db
        .update(outboxEvents)
        .set({ status: "COMPLETED", completedAt: now })
        .where(eq(outboxEvents.id, row.outboxId));

      processed += 1;
    } catch (err) {
      const nextStatus =
        row.attempts + 1 >= MAX_ATTEMPTS ? "FAILED" : "PENDING";
      const errorMessage = err instanceof Error ? err.message : String(err);

      await db
        .update(outboxEvents)
        .set({ status: nextStatus, error: errorMessage })
        .where(eq(outboxEvents.id, row.outboxId));

      console.error(
        `[OutboxWorker] Failed to process outbox event ${row.outboxId}:`,
        errorMessage,
      );
    }
  }

  return processed;
}
