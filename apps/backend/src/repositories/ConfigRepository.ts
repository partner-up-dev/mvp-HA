import { eq } from 'drizzle-orm';
import { config } from '../entities/config';
import { db } from '../lib/db';

export class ConfigRepository {
  async findValueByKey(key: string): Promise<string | null> {
    const rows = await db.select({ value: config.value }).from(config).where(eq(config.key, key)).limit(1);
    return rows[0]?.value ?? null;
  }
}
