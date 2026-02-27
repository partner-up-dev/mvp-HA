/**
 * In-process domain event bus.
 *
 * Provides synchronous publish/subscribe for domain events within the same
 * process. Events are dispatched to all registered listeners sequentially.
 * Listener errors are caught and logged — they never propagate to the
 * publisher.
 *
 * For durable delivery, combine with the outbox writer so that events
 * are persisted before being dispatched through this bus.
 */

import { randomUUID } from "crypto";
import type {
  DomainEvent,
  DomainEventPayloadMap,
  DomainEventType,
} from "./event-types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EventListener<T extends DomainEventType> = (
  event: DomainEvent<T>,
) => void | Promise<void>;

type AnyListener = EventListener<DomainEventType>;

// ---------------------------------------------------------------------------
// Bus implementation
// ---------------------------------------------------------------------------

class EventBusImpl {
  private listeners = new Map<DomainEventType, AnyListener[]>();

  /**
   * Register a listener for a specific event type.
   * Returns an unsubscribe function.
   */
  on<T extends DomainEventType>(
    type: T,
    listener: EventListener<T>,
  ): () => void {
    const list = this.listeners.get(type) ?? [];
    list.push(listener as AnyListener);
    this.listeners.set(type, list);

    return () => {
      const current = this.listeners.get(type);
      if (!current) return;
      const idx = current.indexOf(listener as AnyListener);
      if (idx >= 0) current.splice(idx, 1);
    };
  }

  /**
   * Publish a domain event. All registered listeners are invoked
   * sequentially. Errors are caught and logged.
   */
  async publish<T extends DomainEventType>(
    type: T,
    aggregateType: string,
    aggregateId: string,
    payload: DomainEventPayloadMap[T],
  ): Promise<DomainEvent<T>> {
    const event: DomainEvent<T> = {
      id: randomUUID(),
      type,
      aggregateType,
      aggregateId,
      payload,
      occurredAt: new Date(),
    };

    const listeners = this.listeners.get(type) ?? [];
    for (const listener of listeners) {
      try {
        await listener(event as DomainEvent<DomainEventType>);
      } catch (err) {
        console.error(`[EventBus] Listener error for ${type}:`, err);
      }
    }

    return event;
  }

  /** Remove all listeners (useful for testing). */
  clear(): void {
    this.listeners.clear();
  }
}

/** Singleton event bus instance. */
export const eventBus = new EventBusImpl();
