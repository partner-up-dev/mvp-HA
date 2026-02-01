import { promises as fs, type Dirent } from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { env } from "../lib/env";

const defaultPostersDir =
  process.platform === "win32"
    ? path.join(process.cwd(), "posters")
    : "/mnt/oss/posters";

export class PosterStorageService {
  private postersDir = env.POSTERS_DIR ?? defaultPostersDir;

  async savePoster(
    imageBuffer: Buffer,
  ): Promise<{ key: string; filename: string; filepath: string }> {
    await fs.mkdir(this.postersDir, { recursive: true });
    const key = uuidv4();
    const filename = `${key}.png`;
    const filepath = path.join(this.postersDir, filename);
    await fs.writeFile(filepath, imageBuffer);

    return { key, filename, filepath };
  }

  getPosterFilename(key: string): string {
    return `${key}.png`;
  }

  getPosterFilePath(key: string): string {
    return path.join(this.postersDir, this.getPosterFilename(key));
  }

  async readPoster(key: string): Promise<Buffer> {
    return fs.readFile(this.getPosterFilePath(key));
  }

  async exists(key: string): Promise<boolean> {
    try {
      await fs.access(this.getPosterFilePath(key));
      return true;
    } catch {
      return false;
    }
  }

  async cleanupOldPosters(maxAgeMs: number): Promise<number> {
    let removed = 0;
    let entries: Dirent[];

    try {
      entries = await fs.readdir(this.postersDir, { withFileTypes: true });
    } catch {
      return removed;
    }
    const now = Date.now();

    await Promise.all(
      entries.map(async (entry) => {
        if (!entry.isFile()) return;

        const filepath = path.join(this.postersDir, entry.name);
        const stats = await fs.stat(filepath);
        if (now - stats.mtimeMs > maxAgeMs) {
          await fs.unlink(filepath);
          removed += 1;
        }
      }),
    );

    return removed;
  }
}
