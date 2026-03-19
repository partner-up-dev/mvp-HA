import { z } from "zod";
import { env } from "../lib/env";
import { proxyFetch } from "../lib/proxy-fetch";
import type { ReminderType } from "../entities/notification-delivery";

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

const templateSendResponseSchema = z.object({
  errcode: z.number().int(),
  errmsg: z.string().optional(),
  msgid: z.number().int().optional(),
});

export class WeChatTemplateMessageError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string | null,
  ) {
    super(message);
    this.name = "WeChatTemplateMessageError";
  }
}

let accessTokenCache: TokenCache | null = null;

export interface SendReminderTemplateParams {
  openId: string;
  reminderType: ReminderType;
  title: string;
  startAtLabel: string;
  location: string | null;
  prUrl: string | null;
}

export class WeChatTemplateMessageService {
  isReminderConfigured(): boolean {
    return Boolean(
      env.WECHAT_OFFICIAL_ACCOUNT_APP_ID &&
        env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET &&
        env.WECHAT_REMINDER_TEMPLATE_ID,
    );
  }

  private getOfficialAccountConfig(): OfficialAccountConfig {
    const appId = env.WECHAT_OFFICIAL_ACCOUNT_APP_ID;
    const appSecret = env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET;
    const templateId = env.WECHAT_REMINDER_TEMPLATE_ID;
    if (!appId) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_ID");
    }
    if (!appSecret) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_SECRET");
    }
    if (!templateId) {
      throw new Error("Missing env: WECHAT_REMINDER_TEMPLATE_ID");
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
      throw new WeChatTemplateMessageError(
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

  async sendReminderTemplate(
    params: SendReminderTemplateParams,
  ): Promise<number | null> {
    const { templateId } = this.getOfficialAccountConfig();
    const accessToken = await this.getAccessToken();

    const url = new URL("https://api.weixin.qq.com/cgi-bin/message/template/send");
    url.searchParams.set("access_token", accessToken);

    const reminderLabel =
      params.reminderType === "T_MINUS_24H" ? "活动前 24 小时提醒" : "活动前 2 小时提醒";

    const response = await proxyFetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        touser: params.openId,
        template_id: templateId,
        url: params.prUrl ?? undefined,
        data: {
          first: { value: `${reminderLabel}：请确认是否按时参加` },
          keyword1: { value: params.title },
          keyword2: { value: params.startAtLabel },
          keyword3: { value: params.location ?? "地点待定" },
          remark: { value: "如无法参加，请尽快退出以释放名额。" },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `WeChat template send failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = templateSendResponseSchema.parse(await response.json());
    if (payload.errcode !== 0) {
      throw new WeChatTemplateMessageError(
        `WeChat template send error: ${payload.errmsg ?? "unknown"}`,
        String(payload.errcode),
      );
    }

    return payload.msgid ?? null;
  }
}

