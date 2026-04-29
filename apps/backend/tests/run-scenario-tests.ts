import { promises as fs } from "node:fs";
import path from "node:path";
import { after } from "node:test";
import { pathToFileURL } from "node:url";
import {
  createScenarioDatabase,
  installScenarioDatabaseEnv,
  resetAndMigrateTestDatabase,
  type ScenarioDatabaseHandle,
} from "./_infra/db/test-database";

const scenarioPattern = /\.scenario\.test\.ts$/;

async function collectScenarioFiles(directory: string): Promise<string[]> {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        return collectScenarioFiles(absolutePath);
      }
      if (entry.isFile() && scenarioPattern.test(entry.name)) {
        return [absolutePath];
      }
      return [];
    }),
  );

  return files.flat().sort();
}

async function cleanupScenarioRun(
  database: ScenarioDatabaseHandle,
): Promise<void> {
  let closeDbError: unknown;
  try {
    const { closeDb } = await import("../src/lib/db");
    await closeDb();
  } catch (error) {
    closeDbError = error;
  }

  await database.cleanup();

  if (closeDbError) {
    throw closeDbError;
  }
}

async function main(): Promise<void> {
  const database = await createScenarioDatabase();
  const databaseUrl = installScenarioDatabaseEnv(database.databaseUrl);
  let cleanupRegistered = false;
  let cleanedUp = false;

  try {
    await resetAndMigrateTestDatabase(databaseUrl);

    const testRoot = path.resolve(process.cwd(), "tests");
    const scenarioFiles = await collectScenarioFiles(testRoot);
    if (scenarioFiles.length === 0) {
      console.info("[scenario] no scenario files found");
      await database.cleanup();
      cleanedUp = true;
      return;
    }

    for (const file of scenarioFiles) {
      await import(pathToFileURL(file).href);
    }

    after(async () => {
      await cleanupScenarioRun(database);
    });
    cleanupRegistered = true;
  } finally {
    if (!cleanupRegistered && !cleanedUp) {
      await database.cleanup();
    }
  }
}

await main();
