import { env } from "../../lib/env";
import {
  assertLocalResetAllowed,
  createSqlClient,
  getAdminDatabaseUrl,
  getDatabaseNameFromUrl,
  isMainModule,
  quoteIdentifier,
} from "./shared";
import { runMigrations } from "./migrate";
import { runSeeds } from "./seed";

export async function runReset(connectionString: string): Promise<void> {
  assertLocalResetAllowed(connectionString);

  const databaseName = getDatabaseNameFromUrl(connectionString);
  const adminSql = createSqlClient(getAdminDatabaseUrl(connectionString));

  try {
    await adminSql`
      select pg_terminate_backend(pid)
      from pg_stat_activity
      where datname = ${databaseName}
        and pid <> pg_backend_pid()
    `;
    await adminSql.unsafe(
      `drop database if exists ${quoteIdentifier(databaseName)}`,
    );
    await adminSql.unsafe(`create database ${quoteIdentifier(databaseName)}`);
  } finally {
    await adminSql.end({ timeout: 5 });
  }

  console.info(`[db:reset] recreated database ${databaseName}`);
  await runMigrations(connectionString);
  await runSeeds(connectionString);
}

async function main(): Promise<void> {
  await runReset(env.DATABASE_URL);
}

if (isMainModule(import.meta.url)) {
  await main();
}
