/**
 * Outbox worker – claims `outbox_events` rows with row-level locks, dispatches
 * them to registered handlers, and marks them as COMPLETED / PENDING / FAILED.
 */

import { and, eq, sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { outboxEvents } from "../../entities/outbox-event";
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

interface ClaimedOutboxRow extends Record<string, unknown> {
  outbox_id: number;
  attempts: number;
  type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: unknown;
  occurred_at: Date | string;
}

const asPayload = (value: unknown): Record<string, unknown> => {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
};

const asDate = (value: Date | string): Date =>
  value instanceof Date ? value : new Date(value);

async function claimOutboxBatch(limit: number): Promise<ClaimedOutboxRow[]> {
  const claimed = await db.transaction(async (tx) =>
    tx.execute<ClaimedOutboxRow>(sql`
      with picked as (
        select o.id
        from outbox_events o
        where o.status = 'PENDING'
        order by o.id asc
        for update skip locked
        limit ${limit}
      )
      update outbox_events o
      set
        status = 'PROCESSING',
        attempts = o.attempts + 1,
        last_attempted_at = now()
      from picked, domain_events d
      where o.id = picked.id
        and d.id = o.event_id
      returning
        o.id as outbox_id,
        o.attempts,
        d.type,
        d.aggregate_type,
        d.aggregate_id,
        d.payload,
        d.occurred_at
    `),
  );
  return claimed;
}

/**
 * Process one batch of pending outbox events.
 * Returns the number of events processed in this tick.
 */
export async function processOutboxBatch(): Promise<number> {
  const claimed = await claimOutboxBatch(BATCH_SIZE);

  let processed = 0;
  for (const row of claimed) {
    const now = new Date();

    try {
      for (const handler of handlers) {
        await handler({
          type: row.type as DomainEventType,
          aggregateType: row.aggregate_type,
          aggregateId: row.aggregate_id,
          payload: asPayload(row.payload),
          occurredAt: asDate(row.occurred_at),
        });
      }

      await db
        .update(outboxEvents)
        .set({ status: "COMPLETED", completedAt: now })
        .where(eq(outboxEvents.id, row.outbox_id));

      processed += 1;
    } catch (error) {
      const nextStatus = row.attempts >= MAX_ATTEMPTS ? "FAILED" : "PENDING";
      const errorMessage = error instanceof Error ? error.message : String(error);

      await db
        .update(outboxEvents)
        .set({ status: nextStatus, error: errorMessage })
        .where(
          and(
            eq(outboxEvents.id, row.outbox_id),
            eq(outboxEvents.status, "PROCESSING"),
          ),
        );

      console.error(
        `[OutboxWorker] Failed to process outbox event ${row.outbox_id}:`,
        errorMessage,
      );
    }
  }

  return processed;
}
