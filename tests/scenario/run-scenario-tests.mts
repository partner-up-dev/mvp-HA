import { promises as fs } from "node:fs";
import path from "node:path";
import { after } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  createScenarioDatabase,
  installScenarioDatabaseEnv,
  resetAndMigrateTestDatabase,
  type ScenarioDatabaseHandle,
} from "../../apps/backend/tests/_infra/db/test-database";
import { closeScenarioBrowser } from "./_infra/browser/browser";
import { loadWorkspaceEnvFiles } from "./_infra/environment/env-files";
import { installScenarioEnvironment } from "./_infra/environment/scenario-environment";
import {
  startBackendServer,
  type StartedBackendServer,
} from "./_infra/server/backend-server";
import {
  startFrontendServer,
  type StartedFrontendServer,
} from "./_infra/server/frontend-server";
import { getAvailablePort } from "./_infra/server/ports";

const scenarioPattern = /\.scenario\.test\.ts$/;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

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

async function cleanupScenarioRun(input: {
  backendServer: StartedBackendServer | null;
  database: ScenarioDatabaseHandle;
  frontendServer: StartedFrontendServer | null;
}): Promise<void> {
  let closeDbError: unknown;

  await closeScenarioBrowser();
  await input.frontendServer?.close();
  await input.backendServer?.close();

  try {
    const { closeDb } = await import("../../apps/backend/src/lib/db");
    await closeDb();
  } catch (error) {
    closeDbError = error;
  }

  await input.database.cleanup();

  if (closeDbError) {
    throw closeDbError;
  }
}

async function main(): Promise<void> {
  loadWorkspaceEnvFiles(repoRoot);

  const backendPort = await getAvailablePort();
  const frontendPort = await getAvailablePort();
  const frontendBaseUrl = `http://127.0.0.1:${frontendPort}`;

  process.env.PORT = String(backendPort);
  process.env.FRONTEND_URL = frontendBaseUrl;
  process.env.VITE_BACKEND_PORT = String(backendPort);
  process.env.VITE_PORT = String(frontendPort);
  process.env.VITE_API_URL = frontendBaseUrl;

  const database = await createScenarioDatabase();
  const databaseUrl = installScenarioDatabaseEnv(database.databaseUrl);
  let backendServer: StartedBackendServer | null = null;
  let frontendServer: StartedFrontendServer | null = null;
  let cleanupRegistered = false;
  let cleanedUp = false;

  try {
    await resetAndMigrateTestDatabase(databaseUrl);

    backendServer = await startBackendServer(backendPort);
    frontendServer = await startFrontendServer({
      backendPort,
      port: frontendPort,
    });
    installScenarioEnvironment({
      backendBaseUrl: backendServer.origin,
      frontendBaseUrl: frontendServer.origin,
    });

    const scenarioRoot = path.resolve(repoRoot, "tests/scenario");
    const scenarioFiles = await collectScenarioFiles(scenarioRoot);
    if (scenarioFiles.length === 0) {
      console.info("[scenario:system] no scenario files found");
      await cleanupScenarioRun({ backendServer, database, frontendServer });
      cleanedUp = true;
      return;
    }

    for (const file of scenarioFiles) {
      await import(pathToFileURL(file).href);
    }

    after(async () => {
      await cleanupScenarioRun({ backendServer, database, frontendServer });
    });
    cleanupRegistered = true;
  } finally {
    if (!cleanupRegistered && !cleanedUp) {
      await cleanupScenarioRun({ backendServer, database, frontendServer });
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
