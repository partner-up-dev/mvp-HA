import { z } from "zod";
import { env } from "../lib/env";
import { proxyFetch } from "../lib/proxy-fetch";
import { ConfigService } from "./ConfigService";

type OfficialAccountConfig = {
  appId: string;
  appSecret: string;
  templateId: string;
};

type TokenCache = {
  token: string;
  expiresAtMs: number;
};

const CLOCK_SKEW_MS = 60_000;

const tokenResponseSchema = z.object({
  access_token: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
  errcode: z.number().int().optional(),
  errmsg: z.string().optional(),
});

const subscribeSendResponseSchema = z.object({
  errcode: z.number().int(),
  errmsg: z.string().optional(),
  msgid: z.union([z.number().int(), z.string()]).optional(),
});

const CONFIG_KEY_WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID =
  "wechat.submsg_confirmation_reminder_template_id";
const CONFIG_KEY_WECHAT_SUBMSG_ACTIVITY_START_REMINDER_TEMPLATE_ID =
  "wechat.submsg_activity_start_reminder_template_id";
const CONFIG_KEY_WECHAT_SUBMSG_BOOKING_RESULT_TEMPLATE_ID =
  "wechat.submsg_booking_result_template_id";
const CONFIG_KEY_WECHAT_SUBMSG_NEW_PARTNER_TEMPLATE_ID =
  "wechat.submsg_new_partner_template_id";
const CONFIG_KEY_WECHAT_SUBMSG_MEETING_POINT_UPDATED_TEMPLATE_ID =
  "wechat.submsg_meeting_point_updated_template_id";
const CONFIG_KEY_WECHAT_SUBMSG_PR_MESSAGE_TEMPLATE_ID =
  "wechat.submsg_pr_message_template_id";

type SubscriptionTemplateKind =
  | "REMINDER_CONFIRMATION"
  | "ACTIVITY_START_REMINDER"
  | "BOOKING_RESULT"
  | "NEW_PARTNER"
  | "MEETING_POINT_UPDATED"
  | "PR_MESSAGE";

const resolveTemplateConfigKey = (kind: SubscriptionTemplateKind): string =>
  kind === "REMINDER_CONFIRMATION"
    ? CONFIG_KEY_WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID
    : kind === "ACTIVITY_START_REMINDER"
      ? CONFIG_KEY_WECHAT_SUBMSG_ACTIVITY_START_REMINDER_TEMPLATE_ID
      : kind === "BOOKING_RESULT"
      ? CONFIG_KEY_WECHAT_SUBMSG_BOOKING_RESULT_TEMPLATE_ID
      : kind === "NEW_PARTNER"
        ? CONFIG_KEY_WECHAT_SUBMSG_NEW_PARTNER_TEMPLATE_ID
        : kind === "MEETING_POINT_UPDATED"
          ? CONFIG_KEY_WECHAT_SUBMSG_MEETING_POINT_UPDATED_TEMPLATE_ID
          : CONFIG_KEY_WECHAT_SUBMSG_PR_MESSAGE_TEMPLATE_ID;

const resolveTemplateEnvFallback = (
  kind: SubscriptionTemplateKind,
): string | null => {
  const value =
    kind === "REMINDER_CONFIRMATION"
      ? env.WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID
      : kind === "ACTIVITY_START_REMINDER"
        ? env.WECHAT_SUBMSG_ACTIVITY_START_REMINDER_TEMPLATE_ID
        : kind === "BOOKING_RESULT"
        ? env.WECHAT_SUBMSG_BOOKING_RESULT_TEMPLATE_ID
        : kind === "NEW_PARTNER"
          ? env.WECHAT_SUBMSG_NEW_PARTNER_TEMPLATE_ID
          : kind === "MEETING_POINT_UPDATED"
            ? env.WECHAT_SUBMSG_MEETING_POINT_UPDATED_TEMPLATE_ID
            : env.WECHAT_SUBMSG_PR_MESSAGE_TEMPLATE_ID;

  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
};

export class WeChatSubscriptionMessageError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string | null,
  ) {
    super(message);
    this.name = "WeChatSubscriptionMessageError";
  }
}

let accessTokenCache: TokenCache | null = null;

export interface SendConfirmationReminderParams {
  openId: string;
  orderContent: string;
  orderNo: string;
  appointmentAt: string;
  remark: string;
  page: string | null;
}

export interface SendNewPartnerNotificationParams {
  openId: string;
  applicantName: string;
  teamName: string;
  tip: string;
  appliedAt: string;
  page: string | null;
}

export interface SendActivityStartReminderParams {
  openId: string;
  activityName: string;
  startAt: string;
  location: string;
  remark: string;
  page: string | null;
}

export interface SendBookingResultNotificationParams {
  openId: string;
  bookingItem: string;
  statusLabel: string;
  activityTime: string;
  address: string;
  bookingDetail: string;
  page: string | null;
}

export interface SendPRMessageNotificationParams {
  openId: string;
  threadTitle: string;
  authorName: string;
  sentAt: string;
  messageSummary: string;
  page: string | null;
}

export interface SendMeetingPointUpdatedNotificationParams {
  openId: string;
  updateType: string;
  operatorName: string;
  updatedAt: string;
  meetingPointDescription: string;
  page: string | null;
}

const clipText = (value: string, max: number): string =>
  value.trim().slice(0, max);

type SubscriptionMessageData = Record<string, { value: string }>;

export class WeChatSubscriptionMessageService {
  private configService: ConfigService;

  constructor() {
    this.configService = new ConfigService();
  }

  async isConfirmationReminderConfigured(): Promise<boolean> {
    return this.isConfigured("REMINDER_CONFIRMATION");
  }

  async isActivityStartReminderConfigured(): Promise<boolean> {
    return this.isConfigured("ACTIVITY_START_REMINDER");
  }

  async isBookingResultConfigured(): Promise<boolean> {
    return this.isConfigured("BOOKING_RESULT");
  }

  async isNewPartnerConfigured(): Promise<boolean> {
    return this.isConfigured("NEW_PARTNER");
  }

  async isMeetingPointUpdatedConfigured(): Promise<boolean> {
    return this.isConfigured("MEETING_POINT_UPDATED");
  }

  async isPRMessageConfigured(): Promise<boolean> {
    return this.isConfigured("PR_MESSAGE");
  }

  async getConfirmationReminderTemplateId(): Promise<string | null> {
    return this.resolveTemplateId("REMINDER_CONFIRMATION");
  }

  async getActivityStartReminderTemplateId(): Promise<string | null> {
    return this.resolveTemplateId("ACTIVITY_START_REMINDER");
  }

  async getBookingResultTemplateId(): Promise<string | null> {
    return this.resolveTemplateId("BOOKING_RESULT");
  }

  async getNewPartnerTemplateId(): Promise<string | null> {
    return this.resolveTemplateId("NEW_PARTNER");
  }

  async getMeetingPointUpdatedTemplateId(): Promise<string | null> {
    return this.resolveTemplateId("MEETING_POINT_UPDATED");
  }

  async getPRMessageTemplateId(): Promise<string | null> {
    return this.resolveTemplateId("PR_MESSAGE");
  }

  private async sendSubscribeMessage(input: {
    kind: SubscriptionTemplateKind;
    openId: string;
    page: string | null;
    data: SubscriptionMessageData;
  }): Promise<string | number | null> {
    const { templateId } = await this.getOfficialAccountConfig(input.kind);
    const accessToken = await this.getAccessToken();

    const url = new URL(
      "https://api.weixin.qq.com/cgi-bin/message/subscribe/bizsend",
    );
    url.searchParams.set("access_token", accessToken);

    const response = await proxyFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: input.openId,
        template_id: templateId,
        page: input.page ?? undefined,
        miniprogram_state: "formal",
        lang: "zh_CN",
        data: input.data,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `WeChat subscribe bizsend failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = subscribeSendResponseSchema.parse(await response.json());
    if (payload.errcode !== 0) {
      throw new WeChatSubscriptionMessageError(
        `WeChat subscribe bizsend error: ${payload.errmsg ?? "unknown"}`,
        String(payload.errcode),
      );
    }

    return payload.msgid ?? null;
  }

  private async isConfigured(kind: SubscriptionTemplateKind): Promise<boolean> {
    const templateId = await this.resolveTemplateId(kind);
    return Boolean(
      env.WECHAT_OFFICIAL_ACCOUNT_APP_ID &&
        env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET &&
        templateId,
    );
  }

  private async resolveTemplateId(
    kind: SubscriptionTemplateKind,
  ): Promise<string | null> {
    const configuredTemplateId = await this.configService.getValue(
      resolveTemplateConfigKey(kind),
    );
    if (configuredTemplateId) {
      return configuredTemplateId;
    }

    return resolveTemplateEnvFallback(kind);
  }

  private async getOfficialAccountConfig(
    kind: SubscriptionTemplateKind,
  ): Promise<OfficialAccountConfig> {
    const appId = env.WECHAT_OFFICIAL_ACCOUNT_APP_ID;
    const appSecret = env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET;
    const templateId = await this.resolveTemplateId(kind);
    if (!appId) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_ID");
    }
    if (!appSecret) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_SECRET");
    }
    if (!templateId) {
      const templateKey = resolveTemplateConfigKey(kind);
      throw new Error(`Missing config: ${templateKey}`);
    }
    return { appId, appSecret, templateId };
  }

  private async getAccessToken(): Promise<string> {
    if (
      accessTokenCache &&
      accessTokenCache.expiresAtMs - CLOCK_SKEW_MS > Date.now()
    ) {
      return accessTokenCache.token;
    }

    const appId = env.WECHAT_OFFICIAL_ACCOUNT_APP_ID;
    const appSecret = env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET;
    if (!appId) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_ID");
    }
    if (!appSecret) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_SECRET");
    }
    const url = new URL("https://api.weixin.qq.com/cgi-bin/token");
    url.searchParams.set("grant_type", "client_credential");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);

    const res = await proxyFetch(url);
    if (!res.ok) {
      throw new Error(
        `WeChat access_token request failed: ${res.status} ${res.statusText}`,
      );
    }

    const payload = tokenResponseSchema.parse(await res.json());
    if (!payload.access_token || !payload.expires_in) {
      throw new WeChatSubscriptionMessageError(
        `WeChat access_token invalid: ${payload.errmsg ?? "unknown"}`,
        payload.errcode === undefined ? null : String(payload.errcode),
      );
    }

    accessTokenCache = {
      token: payload.access_token,
      expiresAtMs: Date.now() + payload.expires_in * 1000,
    };
    return payload.access_token;
  }

  async sendConfirmationReminder(
    params: SendConfirmationReminderParams,
  ): Promise<string | number | null> {
    return this.sendSubscribeMessage({
      kind: "REMINDER_CONFIRMATION",
      openId: params.openId,
      page: params.page,
      data: {
        thing6: { value: clipText(params.orderContent, 20) },
        character_string12: { value: clipText(params.orderNo, 32) },
        date9: { value: clipText(params.appointmentAt, 32) },
        thing7: { value: clipText(params.remark, 20) },
      },
    });
  }

  async sendActivityStartReminder(
    params: SendActivityStartReminderParams,
  ): Promise<string | number | null> {
    return this.sendSubscribeMessage({
      kind: "ACTIVITY_START_REMINDER",
      openId: params.openId,
      page: params.page,
      data: {
        thing1: { value: clipText(params.activityName, 20) },
        date5: { value: clipText(params.startAt, 32) },
        thing8: { value: clipText(params.location, 20) },
        thing7: { value: clipText(params.remark, 20) },
      },
    });
  }

  async sendBookingResultNotification(
    params: SendBookingResultNotificationParams,
  ): Promise<string | number | null> {
    return this.sendSubscribeMessage({
      kind: "BOOKING_RESULT",
      openId: params.openId,
      page: params.page,
      data: {
        thing2: { value: clipText(params.bookingItem, 20) },
        phrase33: { value: clipText(params.statusLabel, 20) },
        time24: { value: clipText(params.activityTime, 32) },
        thing35: { value: clipText(params.address, 20) },
        thing8: { value: clipText(params.bookingDetail, 20) },
      },
    });
  }

  async sendNewPartnerNotification(
    params: SendNewPartnerNotificationParams,
  ): Promise<string | number | null> {
    return this.sendSubscribeMessage({
      kind: "NEW_PARTNER",
      openId: params.openId,
      page: params.page,
      data: {
        thing1: { value: clipText(params.applicantName, 20) },
        thing4: { value: clipText(params.teamName, 20) },
        thing5: { value: clipText(params.tip, 20) },
        time3: { value: clipText(params.appliedAt, 32) },
      },
    });
  }

  async sendPRMessageNotification(
    params: SendPRMessageNotificationParams,
  ): Promise<string | number | null> {
    return this.sendSubscribeMessage({
      kind: "PR_MESSAGE",
      openId: params.openId,
      page: params.page,
      data: {
        thing5: { value: clipText(params.threadTitle, 20) },
        time2: { value: clipText(params.sentAt, 32) },
        name3: { value: clipText(params.authorName, 10) },
        thing4: { value: clipText(params.messageSummary, 20) },
      },
    });
  }

  async sendMeetingPointUpdatedNotification(
    params: SendMeetingPointUpdatedNotificationParams,
  ): Promise<string | number | null> {
    return this.sendSubscribeMessage({
      kind: "MEETING_POINT_UPDATED",
      openId: params.openId,
      page: params.page,
      data: {
        phrase1: { value: clipText(params.updateType, 20) },
        thing2: { value: clipText(params.operatorName, 20) },
        time3: { value: clipText(params.updatedAt, 32) },
        thing6: { value: clipText(params.meetingPointDescription, 20) },
      },
    });
  }
}
