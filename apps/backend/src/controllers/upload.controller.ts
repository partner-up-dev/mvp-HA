import { Hono } from "hono";
import { PosterStorageService } from "../services/PosterStorageService";

const app = new Hono();

const posterStorageService = new PosterStorageService();

export const uploadRoute = app.post("/poster", async (c) => {
  try {
    const formData = await c.req.formData();
    const file = formData.get("poster");

    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return c.json({ error: "Invalid file" }, 400);
    }

    const buffer = await file.arrayBuffer();
    const { key } = await posterStorageService.savePoster(
      Buffer.from(buffer),
    );

    return c.json({ key });
  } catch (error) {
    console.error("Upload error:", error);
    return c.json({ error: "Upload failed" }, 500);
  }
});

// Download endpoint
app.get("/download/:key", async (c) => {
  try {
    const key = c.req.param("key");
    if (!key) {
      return c.json({ error: "Key is required" }, 400);
    }

    const exists = await posterStorageService.exists(key);
    if (!exists) {
      return c.json({ error: "File not found" }, 404);
    }

    const filename = posterStorageService.getPosterFilename(key);
    const fileBuffer = await posterStorageService.readPoster(key);
    return c.body(fileBuffer, 200, {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "public, max-age=31536000", // Cache for 1 year
    });
  } catch (error) {
    console.error("Download error:", error);
    return c.json({ error: "Download failed" }, 500);
  }
});
