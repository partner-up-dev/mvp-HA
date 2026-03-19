/**
 * Outbox writer – persists domain events + outbox rows.
 *
 * Call `writeToOutbox` after (or within) the same logical transaction to
 * guarantee that an event is eventually processed by the outbox worker.
 */

import { db } from "../../lib/db";
import { domainEvents } from "../../entities/domain-event";
import { outboxEvents } from "../../entities/outbox-event";
import type { DomainEvent, DomainEventType } from "./event-types";

export async function writeToOutbox<T extends DomainEventType>(
  event: DomainEvent<T>,
): Promise<void> {
  // Insert domain event row
  await db.insert(domainEvents).values({
    id: event.id,
    type: event.type,
    aggregateType: event.aggregateType,
    aggregateId: event.aggregateId,
    payload: event.payload as unknown as Record<string, unknown>,
    occurredAt: event.occurredAt,
  });

  // Insert outbox row
  await db.insert(outboxEvents).values({
    eventId: event.id,
    status: "PENDING",
  });
}
