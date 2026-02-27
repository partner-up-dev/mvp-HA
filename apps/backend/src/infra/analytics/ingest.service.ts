/**
 * Analytics event ingestion (INFRA-04).
 *
 * Receives typed front-end analytics events and persists them
 * as domain events in the outbox for downstream processing.
 */

import { db } from "../../lib/db";
import { domainEvents } from "../../entities/domain-event";

export interface AnalyticsEvent {
  type: string;
  payload: Record<string, unknown>;
  occurredAt: string; // ISO datetime from client
  sessionId?: string;
}

/**
 * Persist a batch of analytics events.
 * Returns the number of events written.
 */
export async function ingestAnalyticsEvents(
  events: AnalyticsEvent[],
): Promise<number> {
  if (events.length === 0) return 0;

  const rows = events.map((e) => ({
    type: `analytics.${e.type}`,
    aggregateType: "analytics",
    aggregateId: e.sessionId ?? "anonymous",
    payload: e.payload,
    occurredAt: new Date(e.occurredAt),
  }));

  await db.insert(domainEvents).values(rows);
  return rows.length;
}
