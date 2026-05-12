import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { db } from "../../lib/db";
import { env } from "../../lib/env";
import {
  userTelemetryEvents,
  userTelemetryJourneys,
  userTelemetrySegments,
} from "../../entities/user-telemetry";

export type UserTelemetryEventKind = "page" | "track" | "identify" | "group";
export type UserTelemetrySource = "frontend" | "backend";

export type UserTelemetrySegmentInput = {
  id: string;
  segmentKind: string;
  startedAt: string;
  endedAt?: string | null;
  eventId?: number | null;
  prId?: number | null;
  assignedMode?: string | null;
  renderedMode?: string | null;
  assignmentRevision?: string | null;
  segmentStartRoute?: string | null;
  segmentStartSpm?: string | null;
  segmentStartSourceQr?: string | null;
};

export type UserTelemetryEventInput = {
  id: string;
  eventName: string;
  eventKind: UserTelemetryEventKind;
  occurredAt: string;
  source?: UserTelemetrySource;
  anonymousId?: string | null;
  userIdHash?: string | null;
  appJourneyId: string;
  journeyStartedAt?: string | null;
  journeyStartRoute?: string | null;
  journeyStartRouteName?: string | null;
  journeyStartReferrer?: string | null;
  journeyStartSpm?: string | null;
  journeyStartSourceQr?: string | null;
  journeyStartEventId?: number | null;
  journeyStartPrId?: number | null;
  journeyEntryKind?: string | null;
  segmentId?: string | null;
  segment?: UserTelemetrySegmentInput | null;
  routePath?: string | null;
  routeName?: string | null;
  referrer?: string | null;
  startSpm?: string | null;
  currentSpm?: string | null;
  sourceQr?: string | null;
  correlationId?: string | null;
  requestId?: string | null;
  traceId?: string | null;
  eventIdRef?: number | null;
  prIdRef?: number | null;
  cardKey?: string | null;
  segmentKey?: string | null;
  properties: Record<string, unknown>;
};

export type UserTelemetryIngestResult = {
  ingested: number;
};

const normalizeSource = (
  source: UserTelemetrySource | undefined,
): UserTelemetrySource => source ?? "frontend";

const parseDate = (value: string): Date => new Date(value);

const nullableDate = (value: string | null | undefined): Date | null =>
  value ? parseDate(value) : null;

const resolveUserIdHash = (
  userId: string | null | undefined,
  explicitUserIdHash: string | null | undefined,
): string | null => {
  if (explicitUserIdHash) {
    return explicitUserIdHash;
  }
  if (!userId) {
    return null;
  }

  return createHmac("sha256", env.AUTH_JWT_SECRET)
    .update(userId)
    .digest("hex");
};

export async function ingestUserTelemetryEvents(
  events: UserTelemetryEventInput[],
  options: { authenticatedUserId?: string | null } = {},
): Promise<UserTelemetryIngestResult> {
  if (events.length === 0) return { ingested: 0 };

  return await db.transaction(async (tx) => {
    const now = new Date();

    for (const event of events) {
      const occurredAt = parseDate(event.occurredAt);
      const userIdHash = resolveUserIdHash(
        options.authenticatedUserId,
        event.userIdHash,
      );
      await tx
        .insert(userTelemetryJourneys)
        .values({
          id: event.appJourneyId,
          anonymousId: event.anonymousId ?? null,
          userIdHash,
          startedAt: event.journeyStartedAt
            ? parseDate(event.journeyStartedAt)
            : occurredAt,
          lastSeenAt: occurredAt,
          startRoute: event.journeyStartRoute ?? event.routePath ?? null,
          startRouteName:
            event.journeyStartRouteName ?? event.routeName ?? null,
          startReferrer: event.journeyStartReferrer ?? event.referrer ?? null,
          startSpm: event.journeyStartSpm ?? event.startSpm ?? null,
          currentSpm: event.currentSpm ?? event.startSpm ?? null,
          startSourceQr: event.journeyStartSourceQr ?? event.sourceQr ?? null,
          currentSourceQr: event.sourceQr ?? null,
          startEventId: event.journeyStartEventId ?? event.eventIdRef ?? null,
          startPrId: event.journeyStartPrId ?? event.prIdRef ?? null,
          entryKind: event.journeyEntryKind ?? null,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: userTelemetryJourneys.id,
          set: {
            anonymousId: sql`coalesce(excluded.anonymous_id, ${userTelemetryJourneys.anonymousId})`,
            userIdHash: sql`coalesce(excluded.user_id_hash, ${userTelemetryJourneys.userIdHash})`,
            lastSeenAt: sql`greatest(${userTelemetryJourneys.lastSeenAt}, excluded.last_seen_at)`,
            currentSpm: sql`coalesce(excluded.current_spm, ${userTelemetryJourneys.currentSpm})`,
            currentSourceQr: sql`coalesce(excluded.current_source_qr, ${userTelemetryJourneys.currentSourceQr})`,
            updatedAt: now,
          },
        });

      if (event.segment) {
        await tx
          .insert(userTelemetrySegments)
          .values({
            id: event.segment.id,
            appJourneyId: event.appJourneyId,
            segmentKind: event.segment.segmentKind,
            startedAt: parseDate(event.segment.startedAt),
            endedAt: nullableDate(event.segment.endedAt),
            eventId: event.segment.eventId ?? null,
            prId: event.segment.prId ?? null,
            assignedMode: event.segment.assignedMode ?? null,
            renderedMode: event.segment.renderedMode ?? null,
            assignmentRevision: event.segment.assignmentRevision ?? null,
            segmentStartRoute: event.segment.segmentStartRoute ?? null,
            segmentStartSpm: event.segment.segmentStartSpm ?? null,
            segmentStartSourceQr: event.segment.segmentStartSourceQr ?? null,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: userTelemetrySegments.id,
            set: {
              endedAt: sql`coalesce(excluded.ended_at, ${userTelemetrySegments.endedAt})`,
              assignedMode: sql`coalesce(excluded.assigned_mode, ${userTelemetrySegments.assignedMode})`,
              renderedMode: sql`coalesce(excluded.rendered_mode, ${userTelemetrySegments.renderedMode})`,
              assignmentRevision: sql`coalesce(excluded.assignment_revision, ${userTelemetrySegments.assignmentRevision})`,
              updatedAt: now,
            },
          });
      }
    }

    const inserted = await tx
      .insert(userTelemetryEvents)
      .values(
        events.map((event) => ({
          id: event.id,
          eventName: event.eventName,
          eventKind: event.eventKind,
          source: normalizeSource(event.source),
          anonymousId: event.anonymousId ?? null,
          userIdHash: resolveUserIdHash(
            options.authenticatedUserId,
            event.userIdHash,
          ),
          appJourneyId: event.appJourneyId,
          segmentId: event.segmentId ?? event.segment?.id ?? null,
          routePath: event.routePath ?? null,
          routeName: event.routeName ?? null,
          referrer: event.referrer ?? null,
          startSpm: event.startSpm ?? event.journeyStartSpm ?? null,
          currentSpm: event.currentSpm ?? null,
          sourceQr: event.sourceQr ?? null,
          correlationId: event.correlationId ?? null,
          requestId: event.requestId ?? null,
          traceId: event.traceId ?? null,
          eventIdRef: event.eventIdRef ?? null,
          prIdRef: event.prIdRef ?? null,
          cardKey: event.cardKey ?? null,
          segmentKey: event.segmentKey ?? null,
          properties: event.properties,
          occurredAt: parseDate(event.occurredAt),
        })),
      )
      .onConflictDoNothing()
      .returning({ id: userTelemetryEvents.id });

    return { ingested: inserted.length };
  });
}
