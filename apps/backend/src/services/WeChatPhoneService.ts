import { z } from "zod";
import { env } from "../lib/env";
import { proxyFetch } from "../lib/proxy-fetch";
import { isWeChatAbilityMockingEnabled } from "../lib/wechat-ability-mocking";

type ResolvedWeChatPhone = {
  phoneE164: string;
  phoneMasked: string;
};

const accessTokenResponseSchema = z.object({
  access_token: z.string().optional(),
  expires_in: z.coerce.number().int().positive().optional(),
  errcode: z.coerce.number().int().optional(),
  errmsg: z.string().optional(),
});

const phoneResponseSchema = z.object({
  phone_info: z
    .object({
      phoneNumber: z.string().optional(),
      purePhoneNumber: z.string().optional(),
      countryCode: z.string().optional(),
    })
    .optional(),
  errcode: z.coerce.number().int().optional(),
  errmsg: z.string().optional(),
});

const normalizeDigits = (input: string): string =>
  input.replace(/[^\d+]/g, "");

const toE164 = (
  phoneNumber: string,
  countryCode: string | null,
): string | null => {
  const normalizedPhone = normalizeDigits(phoneNumber.trim());
  if (!normalizedPhone) return null;

  if (normalizedPhone.startsWith("+")) {
    const onlyDigits = `+${normalizedPhone.slice(1).replace(/\D/g, "")}`;
    return /^\+\d{6,20}$/.test(onlyDigits) ? onlyDigits : null;
  }

  const normalizedCountryCode = (countryCode ?? "86").replace(/\D/g, "");
  const localDigits = normalizedPhone.replace(/\D/g, "");
  if (!normalizedCountryCode || !localDigits) return null;

  const merged = `+${normalizedCountryCode}${localDigits}`;
  return /^\+\d{6,20}$/.test(merged) ? merged : null;
};

const maskE164Phone = (phoneE164: string): string => {
  const digits = phoneE164.replace(/^\+/, "");
  if (digits.length <= 7) {
    return `${digits.slice(0, 2)}****${digits.slice(-1)}`;
  }

  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
};

export class WeChatPhoneService {
  private accessTokenCache: {
    token: string;
    expiresAtMs: number;
  } | null = null;

  isConfigured(): boolean {
    return Boolean(
      env.WECHAT_OFFICIAL_ACCOUNT_APP_ID && env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET,
    );
  }

  async resolvePhoneFromCredential(
    credential: string,
  ): Promise<ResolvedWeChatPhone> {
    const trimmedCredential = credential.trim();
    if (!trimmedCredential) {
      throw new Error("Missing WeChat phone credential");
    }

    if (isWeChatAbilityMockingEnabled()) {
      const mockPhone = "+8613800138000";
      return {
        phoneE164: mockPhone,
        phoneMasked: maskE164Phone(mockPhone),
      };
    }

    const accessToken = await this.fetchAccessToken();

    const endpoint = new URL(
      "https://api.weixin.qq.com/wxa/business/getuserphonenumber",
    );
    endpoint.searchParams.set("access_token", accessToken);

    const response = await proxyFetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: trimmedCredential,
      }),
    });

    if (!response.ok) {
      throw new Error(
        `WeChat phone API request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = phoneResponseSchema.parse(await response.json());
    if (!payload.phone_info) {
      const message = payload.errmsg ?? "Unknown error";
      throw new Error(
        `WeChat phone API response invalid: errcode=${payload.errcode ?? "?"} errmsg=${message}`,
      );
    }

    const rawPhone =
      payload.phone_info.purePhoneNumber ?? payload.phone_info.phoneNumber ?? "";
    const phoneE164 = toE164(rawPhone, payload.phone_info.countryCode ?? null);

    if (!phoneE164) {
      throw new Error("WeChat phone API returned unsupported phone format");
    }

    return {
      phoneE164,
      phoneMasked: maskE164Phone(phoneE164),
    };
  }

  private async fetchAccessToken(): Promise<string> {
    const nowMs = Date.now();
    if (
      this.accessTokenCache &&
      this.accessTokenCache.expiresAtMs - 60_000 > nowMs
    ) {
      return this.accessTokenCache.token;
    }

    const appId = env.WECHAT_OFFICIAL_ACCOUNT_APP_ID;
    const appSecret = env.WECHAT_OFFICIAL_ACCOUNT_APP_SECRET;

    if (!appId) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_ID");
    }

    if (!appSecret) {
      throw new Error("Missing env: WECHAT_OFFICIAL_ACCOUNT_APP_SECRET");
    }

    const tokenUrl = new URL("https://api.weixin.qq.com/cgi-bin/token");
    tokenUrl.searchParams.set("grant_type", "client_credential");
    tokenUrl.searchParams.set("appid", appId);
    tokenUrl.searchParams.set("secret", appSecret);

    const response = await proxyFetch(tokenUrl);
    if (!response.ok) {
      throw new Error(
        `WeChat access token request failed: ${response.status} ${response.statusText}`,
      );
    }

    const payload = accessTokenResponseSchema.parse(await response.json());
    if (!payload.access_token || !payload.expires_in) {
      const message = payload.errmsg ?? "Unknown error";
      throw new Error(
        `WeChat access token response invalid: errcode=${payload.errcode ?? "?"} errmsg=${message}`,
      );
    }

    this.accessTokenCache = {
      token: payload.access_token,
      expiresAtMs: nowMs + payload.expires_in * 1000,
    };

    return payload.access_token;
  }
}
