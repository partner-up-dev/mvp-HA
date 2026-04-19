import { registerOutboxHandler } from "../../infra/events";
import {
  handleNotificationDomainEvent,
  type NotificationDomainEventDeps,
} from "./use-cases/handle-domain-event";

let notificationOutboxHandlersRegistered = false;

export const registerNotificationOutboxHandlers = (
  deps: NotificationDomainEventDeps,
): void => {
  if (notificationOutboxHandlersRegistered) {
    return;
  }

  registerOutboxHandler((event) => handleNotificationDomainEvent(event, deps));
  notificationOutboxHandlersRegistered = true;
};

