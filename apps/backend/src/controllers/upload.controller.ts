import { Hono } from "hono";
import { promises as fs } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { env } from "../lib/env";

const app = new Hono();

// Ensure posters directory exists
const defaultPostersDir =
  process.platform === "win32"
    ? path.join(process.cwd(), "posters")
    : "/mnt/oss/posters";
const postersDir = env.POSTERS_DIR ?? defaultPostersDir;

export const uploadRoute = app.post("/poster", async (c) => {
  try {
    // Ensure directory exists
    await fs.mkdir(postersDir, { recursive: true });

    const formData = await c.req.formData();
    const file = formData.get("poster") as File;

    if (!file || !file.type.startsWith("image/")) {
      return c.json({ error: "Invalid file" }, 400);
    }

    const key = uuidv4();
    const filename = `${key}.png`;
    const filepath = path.join(postersDir, filename);

    const buffer = await file.arrayBuffer();
    await fs.writeFile(filepath, Buffer.from(buffer));

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

    const filename = `${key}.png`;
    const filepath = path.join(postersDir, filename);

    // Check if file exists
    try {
      await fs.access(filepath);
    } catch {
      return c.json({ error: "File not found" }, 404);
    }

    // Read and serve the file
    const fileBuffer = await fs.readFile(filepath);
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
