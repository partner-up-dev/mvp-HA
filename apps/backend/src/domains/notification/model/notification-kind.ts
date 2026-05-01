import { z } from "zod";

export const notificationKindSchema = z.enum([
  "REMINDER_CONFIRMATION",
  "ACTIVITY_START_REMINDER",
  "BOOKING_RESULT",
  "NEW_PARTNER",
  "MEETING_POINT_UPDATED",
  "PR_MESSAGE",
]);

export type NotificationKind = z.infer<typeof notificationKindSchema>;

export const REMINDER_CONFIRMATION_NOTIFICATION_KIND =
  "REMINDER_CONFIRMATION" as const;
export const ACTIVITY_START_REMINDER_NOTIFICATION_KIND =
  "ACTIVITY_START_REMINDER" as const;
export const BOOKING_RESULT_NOTIFICATION_KIND = "BOOKING_RESULT" as const;
export const NEW_PARTNER_NOTIFICATION_KIND = "NEW_PARTNER" as const;
export const MEETING_POINT_UPDATED_NOTIFICATION_KIND =
  "MEETING_POINT_UPDATED" as const;
export const PR_MESSAGE_NOTIFICATION_KIND = "PR_MESSAGE" as const;
