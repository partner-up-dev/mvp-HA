import path from "path";
import { promises as fs } from "fs";
import { env } from "../lib/env";

const DEFAULT_POSTER_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export class PosterStorageService {
  private postersDir: string;

  constructor() {
    const defaultPostersDir =
      process.platform === "win32"
        ? path.join(process.cwd(), "posters")
        : "/mnt/oss/posters";
    this.postersDir = env.POSTERS_DIR ?? defaultPostersDir;
  }

  async savePoster(imageBuffer: Buffer, filename: string): Promise<string> {
    await fs.mkdir(this.postersDir, { recursive: true });
    const filepath = path.join(this.postersDir, filename);
    await fs.writeFile(filepath, imageBuffer);
    return filename;
  }

  getPosterUrl(filename: string, origin: string): string {
    return `${origin}/api/poster/download/${encodeURIComponent(filename)}`;
  }

  async readPoster(filename: string): Promise<Buffer | null> {
    const filepath = path.join(this.postersDir, filename);
    try {
      await fs.access(filepath);
      return await fs.readFile(filepath);
    } catch {
      return null;
    }
  }

  async cleanupOldPosters(
    maxAgeMs: number = DEFAULT_POSTER_MAX_AGE_MS,
  ): Promise<void> {
    try {
      const entries = await fs.readdir(this.postersDir, {
        withFileTypes: true,
      });
      const now = Date.now();

      await Promise.all(
        entries
          .filter((entry) => entry.isFile())
          .map(async (entry) => {
            const filepath = path.join(this.postersDir, entry.name);
            const stats = await fs.stat(filepath);
            if (now - stats.mtimeMs > maxAgeMs) {
              await fs.unlink(filepath);
            }
          }),
      );
    } catch {
      // Ignore cleanup errors to avoid breaking server.
    }
  }
}
