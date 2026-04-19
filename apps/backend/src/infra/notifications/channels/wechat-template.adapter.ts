import type { NotificationDispatchSendResult } from "../../../domains/notification";
import {
  WeChatTemplateMessageError,
  WeChatTemplateMessageService,
} from "../../../services/WeChatTemplateMessageService";
import {
  toChannelErrorLike,
  toFailedDispatchResult,
  type WeChatTemplateChannelMessage,
} from "./notification-channel-adapter";

const service = new WeChatTemplateMessageService();

const classifyWeChatTemplateError = (error: unknown): {
  code: string | null;
  message: string;
} => {
  if (error instanceof WeChatTemplateMessageError) {
    return {
      code: error.errorCode,
      message: error.message,
    };
  }

  return toChannelErrorLike(error);
};

export const isWeChatTemplateReminderConfigured = async (): Promise<boolean> =>
  service.isReminderConfigured();

export const sendWeChatTemplateNotification = async (
  message: WeChatTemplateChannelMessage,
): Promise<NotificationDispatchSendResult> => {
  try {
    const providerMessageId = await service.sendReminderTemplate({
      openId: message.openId,
      trigger: message.trigger,
      title: message.title,
      startAtLabel: message.startAtLabel,
      location: message.location,
      prUrl: message.prUrl,
    });
    return {
      status: "SENT",
      providerMessageId,
    };
  } catch (error) {
    return toFailedDispatchResult(classifyWeChatTemplateError(error));
  }
};

