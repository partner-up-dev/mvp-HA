import { z } from "zod";
import { env } from "../lib/env";
import { proxyFetch } from "../lib/proxy-fetch";

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

const clipText = (value: string, max: number): string =>
  value.trim().slice(0, max);

export class WeChatSubscriptionMessageService {
  isConfirmationReminderConfigured(): boolean {
    return Boolean(
      env.WECHAT_OFFICIAL_ACCOUNT_APP_ID &&
        env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET &&
        env.WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID,
    );
  }

  private getOfficialAccountConfig(): OfficialAccountConfig {
    const appId = env.WECHAT_OFFICIAL_ACCOUNT_APP_ID;
    const appSecret = env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET;
    const templateId = env.WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID;
    if (!appId) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_ID");
    }
    if (!appSecret) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_SECRET");
    }
    if (!templateId) {
      throw new Error(
        "Missing env: WECHAT_SUBMSG_CONFIRMATION_REMINDER_TEMPLATE_ID",
      );
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

    const { appId, appSecret } = this.getOfficialAccountConfig();
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
    const { templateId } = this.getOfficialAccountConfig();
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
}

