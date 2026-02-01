import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import {
  posterGenerationSchema,
  type PosterGenerationRequest,
} from "../lib/poster";
import { HtmlPosterService } from "../services/HtmlPosterService";
import { PosterStorageService } from "../services/PosterStorageService";
import { PuppeteerRenderService } from "../services/PuppeteerRenderService";

const app = new Hono();

const htmlPosterService = new HtmlPosterService();
export const posterStorageService = new PosterStorageService();
export const posterRenderService = new PuppeteerRenderService();

const isWeChatBrowser = (userAgent: string): boolean =>
  /MicroMessenger/i.test(userAgent);

const getRequestOrigin = (reqUrl: string, headers: Headers): string => {
  const forwardedProto = headers.get("x-forwarded-proto");
  const forwardedHost = headers.get("x-forwarded-host");

  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  const url = new URL(reqUrl);
  return url.origin;
};

const resolveShouldSave = (
  payload: PosterGenerationRequest,
  userAgent: string,
): boolean => payload.saveOnServer ?? isWeChatBrowser(userAgent);

app.post("/generate", zValidator("json", posterGenerationSchema), async (c) => {
  const payload = c.req.valid("json");
  const userAgent = c.req.header("user-agent") ?? "";
  const shouldSave = resolveShouldSave(payload, userAgent);

  try {
    const generated = await htmlPosterService.generatePosterHtml({
      caption: payload.caption,
      style: payload.style,
      ratio: payload.ratio,
      includeAiGraphics: payload.includeAiGraphics,
    });

    const imageBuffer = await posterRenderService.renderHtmlToPng(
      generated.html,
      generated.dimensions,
    );

    if (shouldSave) {
      const { key } = await posterStorageService.savePoster(imageBuffer);
      const origin = getRequestOrigin(c.req.url, c.req.raw.headers);
      const posterUrl = new URL(`/api/upload/download/${key}`, origin).toString();
      return c.json({ posterUrl, saved: true });
    }

    const posterUrl = `data:image/png;base64,${imageBuffer.toString("base64")}`;
    return c.json({ posterUrl, saved: false });
  } catch (error) {
    console.error("Poster generation failed:", error);
    throw new HTTPException(500, { message: "Poster generation failed" });
  }
});

export const posterRoute = app;
