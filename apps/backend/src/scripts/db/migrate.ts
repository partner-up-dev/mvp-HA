import {
  acquireMigrationLock,
  applyMigrationFile,
  createSqlClient,
  ensureMigrationLedger,
  isMainModule,
  lintMigrationFiles,
  loadMigrationFiles,
  releaseMigrationLock,
} from "./shared";

function readDatabaseUrlFromEnv(): string {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.trim().length === 0) {
    throw new Error("Missing required env var: DATABASE_URL");
  }

  return databaseUrl;
}

export async function runMigrations(connectionString: string): Promise<void> {
  await lintMigrationFiles();

  const sql = createSqlClient(connectionString);
  try {
    await ensureMigrationLedger(sql);
    await acquireMigrationLock(sql);

    const migrations = await loadMigrationFiles();
    let appliedCount = 0;
    let skippedCount = 0;

    for (const migration of migrations) {
      const result = await applyMigrationFile(sql, migration);
      if (result.skipped) {
        skippedCount += 1;
        console.info(`[db:migrate] skip ${migration.relativePath}`);
      } else {
        appliedCount += 1;
        console.info(
          `[db:migrate] apply ${migration.relativePath} (${result.durationMs}ms)`,
        );
      }
    }

    console.info(
      `[db:migrate] complete. applied=${appliedCount} skipped=${skippedCount}`,
    );
  } finally {
    try {
      await releaseMigrationLock(sql);
    } finally {
      await sql.end({ timeout: 5 });
    }
  }
}

async function main(): Promise<void> {
  await runMigrations(readDatabaseUrlFromEnv());
}

if (isMainModule(import.meta.url)) {
  await main();
}
