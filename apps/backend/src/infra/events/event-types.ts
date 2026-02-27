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
  | "partner.joined"
  | "partner.exited"
  | "partner.confirmed"
  | "partner.checked_in"
  | "partner.slot_released";

// ---------------------------------------------------------------------------
// Per-event payload shapes
// ---------------------------------------------------------------------------

export interface PRCreatedPayload {
  prId: number;
  source: "natural_language" | "structured";
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
  reason: "unconfirmed" | "exited";
}

// ---------------------------------------------------------------------------
// Payload map (type → payload)
// ---------------------------------------------------------------------------

export interface DomainEventPayloadMap {
  "pr.created": PRCreatedPayload;
  "pr.status_changed": PRStatusChangedPayload;
  "pr.content_updated": PRContentUpdatedPayload;
  "partner.joined": PartnerJoinedPayload;
  "partner.exited": PartnerExitedPayload;
  "partner.confirmed": PartnerConfirmedPayload;
  "partner.checked_in": PartnerCheckedInPayload;
  "partner.slot_released": PartnerSlotReleasedPayload;
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
