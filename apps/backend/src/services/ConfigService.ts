import { env } from '../lib/env';
import { withTimeout } from '../lib/with-timeout';
import { ConfigRepository } from '../repositories/ConfigRepository';

const repo = new ConfigRepository();

export class ConfigService {
  async getValueOrFallback(key: string, fallback: string): Promise<string> {
    try {
      const value = await withTimeout(
        repo.findValueByKey(key),
        env.DB_OPERATION_TIMEOUT_MS,
        `Config lookup timed out for key: ${key}`,
      );

      const trimmed = value?.trim();
      return trimmed && trimmed.length > 0 ? trimmed : fallback;
    } catch {
      return fallback;
    }
  }
}
