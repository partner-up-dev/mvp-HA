/**
 * Domain event type definitions.
 *
 * Every significant domain action emits a typed event.
 * These types form the contract between event producers (use-cases)
 * and consumers (outbox workers, analytics, notifications).
 */

// ---------------------------------------------------------------------------
// Event type union
// ---------------------------------------------------------------------------

export type DomainEventType =
  | "pr.created"
  | "pr.status_changed"
  | "pr.content_updated"
  | "pr.message_created"
  | "pr.auto_created"
  | "pr.booking_triggered"
  | "partner.joined"
  | "partner.exited"
  | "partner.confirmed"
  | "partner.checked_in"
  | "partner.slot_released"
  | "notification.wave_opened"
  | "notification.opportunity_created";

// ---------------------------------------------------------------------------
// Per-event payload shapes
// ---------------------------------------------------------------------------

export interface PRCreatedPayload {
  prId: number;
  source: "natural_language" | "structured" | "event_assisted";
  status: string;
  creatorOpenId: string | null;
}

export interface PRStatusChangedPayload {
  prId: number;
  fromStatus: string;
  toStatus: string;
  trigger: "manual" | "temporal" | "capacity";
}

export interface PRContentUpdatedPayload {
  prId: number;
}

export interface PRMessageCreatedPayload {
  prId: number;
  messageId: number;
  authorUserId: string;
}

export interface PRAutoCreatedPayload {
  sourcePrId: number;
  createdPrId: number;
  anchorEventId: number | null;
  timeWindow: [string | null, string | null] | null;
  location: string | null;
  activeCountAtSource: number;
}

export interface PRBookingTriggeredPayload {
  prId: number;
  activePartnerCount: number;
  bookingTriggeredAt: string;
}

export interface PartnerJoinedPayload {
  prId: number;
  partnerId: number;
  userId: string;
  autoConfirmed: boolean;
}

export interface PartnerExitedPayload {
  prId: number;
  partnerId: number;
  userId: string;
}

export interface PartnerConfirmedPayload {
  prId: number;
  partnerId: number;
  userId: string;
}

export interface PartnerCheckedInPayload {
  prId: number;
  partnerId: number;
  userId: string;
  didAttend: boolean;
}

export interface PartnerSlotReleasedPayload {
  prId: number;
  partnerId: number;
  reason: "unconfirmed" | "exited" | "manual";
  trigger: "system" | "admin_manual";
  manualReason: string | null;
}

export interface NotificationWaveOpenedPayload {
  notificationKind: "PR_MESSAGE";
  aggregateType: string;
  aggregateId: string;
  recipientUserId: string;
  waveKey: string;
  waveId: number | null;
  sourceEventId: string | null;
  waveStartMessageId: number;
  waveStartAuthorUserId: string;
}

export interface NotificationOpportunityCreatedPayload {
  notificationKind:
    | "REMINDER_CONFIRMATION"
    | "ACTIVITY_START_REMINDER"
    | "BOOKING_RESULT"
    | "NEW_PARTNER"
    | "MEETING_POINT_UPDATED"
    | "PR_MESSAGE";
  lifecycleModel: "WAVE" | "ONE_SHOT";
  aggregateType: string;
  aggregateId: string;
  recipientUserId: string;
  channel: "WECHAT_SUBSCRIPTION" | "WECHAT_TEMPLATE" | "EMAIL" | "SMS";
  runAtIso: string;
  dedupeKey: string;
  opportunityId: number | null;
  sourceEventId: string | null;
  payload: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Payload map (type → payload)
// ---------------------------------------------------------------------------

export interface DomainEventPayloadMap {
  "pr.created": PRCreatedPayload;
  "pr.status_changed": PRStatusChangedPayload;
  "pr.content_updated": PRContentUpdatedPayload;
  "pr.message_created": PRMessageCreatedPayload;
  "pr.auto_created": PRAutoCreatedPayload;
  "pr.booking_triggered": PRBookingTriggeredPayload;
  "partner.joined": PartnerJoinedPayload;
  "partner.exited": PartnerExitedPayload;
  "partner.confirmed": PartnerConfirmedPayload;
  "partner.checked_in": PartnerCheckedInPayload;
  "partner.slot_released": PartnerSlotReleasedPayload;
  "notification.wave_opened": NotificationWaveOpenedPayload;
  "notification.opportunity_created": NotificationOpportunityCreatedPayload;
}

// ---------------------------------------------------------------------------
// Domain event envelope
// ---------------------------------------------------------------------------

export interface DomainEvent<T extends DomainEventType = DomainEventType> {
  id: string;
  type: T;
  aggregateType: string;
  aggregateId: string;
  payload: DomainEventPayloadMap[T];
  occurredAt: Date;
}
