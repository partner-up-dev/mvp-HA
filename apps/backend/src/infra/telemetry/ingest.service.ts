import { db } from "../../lib/db";
import { telemetryEvents } from "../../entities/telemetry-event";
import type { TelemetryEventType } from "./event-taxonomy";

export interface TelemetryEvent {
  type: TelemetryEventType;
  payload: Record<string, unknown>;
  occurredAt: string;
  source?: string;
  sessionId?: string;
  userIdHash?: string;
  requestId?: string;
}

export interface TelemetryIngestResult {
  ingested: number;
}

const normalizeSource = (source: string | undefined): string => {
  const trimmed = source?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "frontend";
};

export async function ingestTelemetryEvents(
  events: TelemetryEvent[],
): Promise<TelemetryIngestResult> {
  if (events.length === 0) return { ingested: 0 };

  await db.insert(telemetryEvents).values(
    events.map((event) => ({
      type: event.type,
      source: normalizeSource(event.source),
      sessionId: event.sessionId ?? null,
      userIdHash: event.userIdHash ?? null,
      requestId: event.requestId ?? null,
      payload: event.payload,
      occurredAt: new Date(event.occurredAt),
    })),
  );

  return {
    ingested: events.length,
  };
}
