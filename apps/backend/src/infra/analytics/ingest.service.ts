/**
 * Analytics event ingestion (INFRA-04).
 *
 * Receives typed front-end analytics events and persists them
 * as domain events in the outbox for downstream processing.
 */

import { db } from "../../lib/db";
import { domainEvents } from "../../entities/domain-event";
import type { AnalyticsEventType } from "./event-taxonomy";
import {
  legacyAnalyticsEventTypeMap,
  type CanonicalAnalyticsEventType,
} from "./event-taxonomy";

export interface AnalyticsEvent {
  type: AnalyticsEventType;
  payload: Record<string, unknown>;
  occurredAt: string; // ISO datetime from client
  sessionId?: string;
}

export interface AnalyticsIngestResult {
  ingested: number;
  dropped: number;
}

const isLegacyAnalyticsEventType = (
  type: AnalyticsEventType,
): type is keyof typeof legacyAnalyticsEventTypeMap =>
  Object.prototype.hasOwnProperty.call(legacyAnalyticsEventTypeMap, type);

const canonicalizeEventType = (
  type: AnalyticsEventType,
): CanonicalAnalyticsEventType | null => {
  if (type === "share_converted" || type === "repeat_join_14d") {
    return null;
  }
  if (isLegacyAnalyticsEventType(type)) {
    return legacyAnalyticsEventTypeMap[type];
  }
  return type as CanonicalAnalyticsEventType;
};

/**
 * Persist a batch of analytics events.
 * Returns ingestion stats.
 */
export async function ingestAnalyticsEvents(
  events: AnalyticsEvent[],
): Promise<AnalyticsIngestResult> {
  if (events.length === 0) return { ingested: 0, dropped: 0 };

  const rows = events
    .map((event) => {
      const canonicalType = canonicalizeEventType(event.type);
      if (!canonicalType) return null;
      return {
        type: `analytics.${canonicalType}`,
        aggregateType: "analytics",
        aggregateId: event.sessionId ?? "anonymous",
        payload: event.payload,
        occurredAt: new Date(event.occurredAt),
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  if (rows.length > 0) {
    await db.insert(domainEvents).values(rows);
  }

  return {
    ingested: rows.length,
    dropped: events.length - rows.length,
  };
}
