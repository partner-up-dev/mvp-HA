import type { ConfirmationReminderTrigger } from "../../../entities/notification-delivery";
import type {
  NotificationDispatchFailureReason,
  NotificationDispatchSendResult,
} from "../../../domains/notification";

type NotificationChannelErrorLike = {
  code: string | null;
  message: string;
};

export type WeChatSubscriptionChannelMessage =
  | {
      kind: "REMINDER_CONFIRMATION";
      openId: string;
      orderContent: string;
      orderNo: string;
      appointmentAt: string;
      remark: string;
      page: string | null;
    }
  | {
      kind: "ACTIVITY_START_REMINDER";
      openId: string;
      activityName: string;
      startAt: string;
      location: string;
      remark: string;
      page: string | null;
    }
  | {
      kind: "BOOKING_RESULT";
      openId: string;
      bookingItem: string;
      statusLabel: string;
      activityTime: string;
      address: string;
      bookingDetail: string;
      page: string | null;
    }
  | {
      kind: "NEW_PARTNER";
      openId: string;
      applicantName: string;
      teamName: string;
      tip: string;
      appliedAt: string;
      page: string | null;
    }
  | {
      kind: "PR_MESSAGE";
      openId: string;
      threadTitle: string;
      authorName: string;
      sentAt: string;
      messageSummary: string;
      page: string | null;
    };

export type WeChatTemplateChannelMessage = {
  kind: "REMINDER_CONFIRMATION";
  openId: string;
  trigger: ConfirmationReminderTrigger;
  title: string;
  startAtLabel: string;
  location: string | null;
  prUrl: string | null;
};

export const toFailedDispatchResult = (
  error: NotificationChannelErrorLike,
): NotificationDispatchSendResult => ({
  status: "FAILED",
  reason: resolveFailureReason(error.code),
  errorCode: error.code,
  errorMessage: error.message,
});

const resolveFailureReason = (
  errorCode: string | null,
): NotificationDispatchFailureReason =>
  errorCode === "43101" ? "RECIPIENT_PERMISSION_REVOKED" : "TRANSPORT_ERROR";

export const toChannelErrorLike = (error: unknown): NotificationChannelErrorLike => {
  if (error instanceof Error) {
    return {
      code: null,
      message: error.message,
    };
  }

  return {
    code: null,
    message: String(error),
  };
};

