import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { randomInt } from "crypto";
import { PartnerRequestService } from "../services/PartnerRequestService";
import { WeComService } from "../services/WeComService";
import { env } from "../lib/env";
import {
  decryptWeComMessage,
  extractXmlTagValue,
  verifySignature,
} from "../lib/wecom-crypto";

const app = new Hono();
const prService = new PartnerRequestService();
const wecomService = new WeComService();

const wecomQuerySchema = z.object({
  msg_signature: z.string().min(1),
  timestamp: z.string().min(1),
  nonce: z.string().min(1),
});

const wecomVerifySchema = wecomQuerySchema.extend({
  echostr: z.string().min(1),
});

const getCryptoConfig = () => {
  const token = env.WECOM_TOKEN;
  const encodingAesKey = env.WECOM_ENCODING_AES_KEY;
  const corpId = env.WECOM_CORP_ID;

  if (!token) {
    throw new Error("Missing env: WECOM_TOKEN");
  }
  if (!encodingAesKey) {
    throw new Error("Missing env: WECOM_ENCODING_AES_KEY");
  }
  if (!corpId) {
    throw new Error("Missing env: WECOM_CORP_ID");
  }

  return { token, encodingAesKey, corpId };
};

const normalizeFrontendUrl = (raw: string) => {
  const trimmed = raw.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  return withProtocol.replace(/\/+$/, "");
};

const generatePin = () => `${randomInt(0, 10_000)}`.padStart(4, "0");

export const wecomRoute = app
  .get("/message", zValidator("query", wecomVerifySchema), async (c) => {
    const { msg_signature, timestamp, nonce, echostr } = c.req.valid("query");
    const { token, encodingAesKey, corpId } = getCryptoConfig();

    const valid = verifySignature({
      token,
      timestamp,
      nonce,
      encrypted: echostr,
      signature: msg_signature,
    });

    if (!valid) {
      return c.text("Invalid signature", 400);
    }

    try {
      const { xml } = decryptWeComMessage(encodingAesKey, corpId, echostr);
      return c.text(xml);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Decrypt failed";
      return c.text(message, 400);
    }
  })
  .post("/message", zValidator("query", wecomQuerySchema), async (c) => {
    const { msg_signature, timestamp, nonce } = c.req.valid("query");
    const { token, encodingAesKey, corpId } = getCryptoConfig();
    const body = await c.req.text();
    const encrypted = extractXmlTagValue(body, "Encrypt");

    if (!encrypted) {
      return c.text("Missing Encrypt", 400);
    }

    const valid = verifySignature({
      token,
      timestamp,
      nonce,
      encrypted,
      signature: msg_signature,
    });

    if (!valid) {
      return c.text("Invalid signature", 400);
    }

    const task = (async () => {
      const { xml } = decryptWeComMessage(encodingAesKey, corpId, encrypted);
      const msgType = extractXmlTagValue(xml, "MsgType");
      if (msgType !== "text") {
        return;
      }

      const content = extractXmlTagValue(xml, "Content");
      const fromUser = extractXmlTagValue(xml, "FromUserName");
      const createTime = extractXmlTagValue(xml, "CreateTime");

      if (!content || !fromUser || !createTime) {
        return;
      }

      const trimmedContent = content.trim();
      if (!trimmedContent) {
        return;
      }

      const timestampSeconds = Number(createTime);
      if (!Number.isFinite(timestampSeconds)) {
        return;
      }

      const nowIso = new Date(timestampSeconds * 1000).toISOString();
      const pin = generatePin();
      const { id } = await prService.createPRFromNaturalLanguage(
        trimmedContent,
        pin,
        nowIso,
      );

      const frontendUrl = env.FRONTEND_URL;
      if (!frontendUrl) {
        throw new Error("Missing env: FRONTEND_URL");
      }

      const shareUrl = `${normalizeFrontendUrl(frontendUrl)}/pr/${id}`;
      const reply = `搭子请求已创建：${shareUrl}\nPIN：${pin}`;

      await wecomService.sendTextMessage({
        toUser: fromUser,
        content: reply,
      });
    })();

    task.catch((error) => {
      console.error("WeCom async reply failed", error);
    });

    return c.text("ok");
  });
