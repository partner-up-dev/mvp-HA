import {
  assertSupportedNextMigrationFolder,
  computeNextMigrationPrefix,
  isMainModule,
} from "./shared";

async function main(): Promise<void> {
  const folder = process.argv[2];
  if (!folder) {
    throw new Error("Usage: pnpm db:next-migration <drizzle|data-migrations>");
  }

  assertSupportedNextMigrationFolder(folder);
  const nextPrefix = await computeNextMigrationPrefix();
  console.info(nextPrefix);
}

if (isMainModule(import.meta.url)) {
  await main();
}
