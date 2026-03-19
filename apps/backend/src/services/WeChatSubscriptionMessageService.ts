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
const CONFIG_KEY_WECHAT_SUBMSG_NEW_PARTNER_TEMPLATE_ID =
  "wechat.submsg_new_partner_template_id";

type SubscriptionTemplateKind = "REMINDER_CONFIRMATION" | "NEW_PARTNER";

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
}

export interface SendNewPartnerNotificationParams {
  openId: string;
  applicantName: string;
  teamName: string;
  tip: string;
  appliedAt: string;
}

const clipText = (value: string, max: number): string =>
  value.trim().slice(0, max);

export class WeChatSubscriptionMessageService {
  private configService: ConfigService;

  constructor() {
    this.configService = new ConfigService();
  }

  async isConfirmationReminderConfigured(): Promise<boolean> {
    return this.isConfigured("REMINDER_CONFIRMATION");
  }

  async isNewPartnerConfigured(): Promise<boolean> {
    return this.isConfigured("NEW_PARTNER");
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
    const configKey =
      kind === "REMINDER_CONFIRMATION"
        ? CONFIG_KEY_WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID
        : CONFIG_KEY_WECHAT_SUBMSG_NEW_PARTNER_TEMPLATE_ID;

    const configuredTemplateId = await this.configService.getValue(configKey);
    if (configuredTemplateId) {
      return configuredTemplateId;
    }

    return null;
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
      const templateKey =
        kind === "REMINDER_CONFIRMATION"
          ? "wechat.submsg_confirmation_reminder_template_id"
          : "wechat.submsg_new_partner_template_id";
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
    const { templateId } = await this.getOfficialAccountConfig(
      "REMINDER_CONFIRMATION",
    );
    const accessToken = await this.getAccessToken();

    const url = new URL(
      "https://api.weixin.qq.com/cgi-bin/message/subscribe/bizsend",
    );
    url.searchParams.set("access_token", accessToken);

    const response = await proxyFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: params.openId,
        template_id: templateId,
        miniprogram_state: "formal",
        lang: "zh_CN",
        data: {
          thing6: { value: clipText(params.orderContent, 20) },
          character_string12: { value: clipText(params.orderNo, 32) },
          date9: { value: clipText(params.appointmentAt, 32) },
          thing7: { value: clipText(params.remark, 20) },
        },
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

  async sendNewPartnerNotification(
    params: SendNewPartnerNotificationParams,
  ): Promise<string | number | null> {
    const { templateId } = await this.getOfficialAccountConfig("NEW_PARTNER");
    const accessToken = await this.getAccessToken();

    const url = new URL(
      "https://api.weixin.qq.com/cgi-bin/message/subscribe/bizsend",
    );
    url.searchParams.set("access_token", accessToken);

    const response = await proxyFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: params.openId,
        template_id: templateId,
        miniprogram_state: "formal",
        lang: "zh_CN",
        data: {
          thing1: { value: clipText(params.applicantName, 20) },
          thing4: { value: clipText(params.teamName, 20) },
          thing5: { value: clipText(params.tip, 20) },
          time3: { value: clipText(params.appliedAt, 32) },
        },
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
}
