import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { v4 as uuidv4 } from "uuid";
import { resolvePosterStyle, type PosterRatio } from "../services/HtmlPosterService";
import { POSTER_STYLE_KEYS } from "../services/PosterStylePrompts";
import {
  htmlPosterService,
  posterRenderService,
  posterStorageService,
} from "../services/posterServices";

const app = new Hono();

const generatePosterSchema = z.object({
  caption: z.string().min(1),
  style: z
    .union([z.number().int().min(0).max(4), z.enum(POSTER_STYLE_KEYS)])
    .optional(),
  ratio: z.enum(["3:4", "1:1", "4:3"]).optional(),
  saveOnServer: z.boolean().optional(),
});

const isWeChatBrowser = (userAgent: string): boolean =>
  /MicroMessenger/i.test(userAgent);

app.post(
  "/html",
  zValidator("json", generatePosterSchema),
  async (c) => {
    const { caption, style, ratio, saveOnServer } = c.req.valid("json");
    const userAgent = c.req.header("user-agent") ?? "";
    const shouldSave = saveOnServer ?? isWeChatBrowser(userAgent);
    const posterRatio: PosterRatio = ratio ?? "3:4";

    const resolvedStyle = resolvePosterStyle(style);

    const generatedPoster = await htmlPosterService.generatePosterHtml({
      caption,
      style: resolvedStyle,
      ratio: posterRatio,
      saveOnServer: shouldSave,
    });

    const imageBuffer = await posterRenderService.renderHtmlToPng(
      generatedPoster.html,
      generatedPoster.dimensions,
    );

    if (shouldSave) {
      const filename = `${uuidv4()}.png`;
      await posterStorageService.savePoster(imageBuffer, filename);
      const origin = new URL(c.req.url).origin;
      const posterUrl = posterStorageService.getPosterUrl(filename, origin);
      return c.json({ posterUrl, saved: true });
    }

    const base64Image = imageBuffer.toString("base64");
    const posterUrl = `data:image/png;base64,${base64Image}`;
    return c.json({ posterUrl, saved: false });
  },
);

app.get("/download/:filename", async (c) => {
  const filename = c.req.param("filename");
  if (!filename) {
    return c.json({ error: "filename is required" }, 400);
  }

  const posterBuffer = await posterStorageService.readPoster(filename);
  if (!posterBuffer) {
    return c.json({ error: "File not found" }, 404);
  }

  return c.body(posterBuffer, 200, {
    "Content-Type": "image/png",
    "Content-Disposition": `inline; filename="${filename}"`,
    "Cache-Control": "public, max-age=31536000",
  });
});

export const posterRoute = app;
