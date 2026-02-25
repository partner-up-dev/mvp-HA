import { z } from "zod";
import { env } from "../lib/env";
import { proxyFetch } from "../lib/proxy-fetch";

const weChatOauthTokenSchema = z.object({
  access_token: z.string().optional(),
  expires_in: z.number().int().positive().optional(),
  refresh_token: z.string().optional(),
  openid: z.string().optional(),
  scope: z.string().optional(),
  unionid: z.string().optional(),
  errcode: z.number().int().optional(),
  errmsg: z.string().optional(),
});

export type WeChatOAuthProfile = {
  openId: string;
  unionId: string | null;
  scope: string | null;
};

export class WeChatOAuthService {
  isConfigured(): boolean {
    return Boolean(
      env.WECHAT_OFFICIAL_ACCOUNT_APP_ID && env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET,
    );
  }

  private getAppId(): string {
    const appId = env.WECHAT_OFFICIAL_ACCOUNT_APP_ID;
    if (!appId) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_ID");
    }
    return appId;
  }

  private getAppSecret(): string {
    const appSecret = env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET;
    if (!appSecret) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_SECRET");
    }
    return appSecret;
  }

  createAuthorizeUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      appid: this.getAppId(),
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "snsapi_base",
      state,
    });

    return `https://open.weixin.qq.com/connect/oauth2/authorize?${params.toString()}#wechat_redirect`;
  }

  async exchangeCodeForOpenId(code: string): Promise<WeChatOAuthProfile> {
    const appId = this.getAppId();
    const appSecret = this.getAppSecret();

    const url = new URL("https://api.weixin.qq.com/sns/oauth2/access_token");
    url.searchParams.set("appid", appId);
    url.searchParams.set("secret", appSecret);
    url.searchParams.set("code", code);
    url.searchParams.set("grant_type", "authorization_code");

    const res = await proxyFetch(url);
    if (!res.ok) {
      throw new Error(
        `WeChat oauth access_token request failed: ${res.status} ${res.statusText}`,
      );
    }

    const json = weChatOauthTokenSchema.parse(await res.json());

    if (!json.openid || !json.access_token) {
      const msg = json.errmsg ?? "Unknown error";
      throw new Error(
        `WeChat oauth response invalid: errcode=${json.errcode ?? "?"} errmsg=${msg}`,
      );
    }

    return {
      openId: json.openid,
      unionId: json.unionid ?? null,
      scope: json.scope ?? null,
    };
  }
}
