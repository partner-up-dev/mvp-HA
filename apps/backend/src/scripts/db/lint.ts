import { isMainModule, lintMigrationFiles, lintSeedFiles } from "./shared";

async function main(): Promise<void> {
  await lintMigrationFiles();
  await lintSeedFiles();
  console.info("[db:lint] migration and seed file checks passed");
}

if (isMainModule(import.meta.url)) {
  await main();
}
