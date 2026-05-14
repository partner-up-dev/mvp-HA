import path from "node:path";
import { fileURLToPath } from "node:url";
import type { TestProject } from "vitest/node";
import {
  createScenarioDatabase,
  installScenarioDatabaseEnv,
  resetAndMigrateTestDatabase,
  type ScenarioDatabaseHandle,
} from "../../../../apps/backend/tests/_infra/db/test-database";
import {
  startBackendServer,
  type StartedBackendServer,
} from "../server/backend-server";
import {
  startFrontendServer,
  type StartedFrontendServer,
} from "../server/frontend-server";
import { getAvailablePort } from "../server/ports";
import { loadWorkspaceEnvFiles } from "../environment/env-files";

const repoRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../..",
);

let backendServer: StartedBackendServer | null = null;
let database: ScenarioDatabaseHandle | null = null;
let frontendServer: StartedFrontendServer | null = null;

export async function setup(project: TestProject): Promise<void> {
  loadWorkspaceEnvFiles(repoRoot);

  const backendPort = await getAvailablePort();
  const frontendPort = await getAvailablePort();
  const frontendBaseUrl = `http://127.0.0.1:${frontendPort}`;

  process.env.PORT = String(backendPort);
  process.env.FRONTEND_URL = frontendBaseUrl;
  process.env.VITE_BACKEND_PORT = String(backendPort);
  process.env.VITE_PORT = String(frontendPort);
  process.env.VITE_API_URL = frontendBaseUrl;

  database = await createScenarioDatabase();
  const databaseUrl = installScenarioDatabaseEnv(database.databaseUrl);

  await resetAndMigrateTestDatabase(databaseUrl);

  backendServer = await startBackendServer(backendPort);
  frontendServer = await startFrontendServer({
    backendPort,
    port: frontendPort,
  });

  project.provide("systemScenarioEnvironment", {
    backendBaseUrl: backendServer.origin,
    frontendBaseUrl: frontendServer.origin,
  });
}

export async function teardown(): Promise<void> {
  let closeDbError: unknown;

  await frontendServer?.close();
  await backendServer?.close();
  frontendServer = null;
  backendServer = null;

  try {
    const { closeDb } = await import("../../../../apps/backend/src/lib/db");
    await closeDb();
  } catch (error) {
    closeDbError = error;
  }

  await database?.cleanup();
  database = null;

  if (closeDbError) {
    throw closeDbError;
  }
}

declare module "vitest" {
  export interface ProvidedContext {
    systemScenarioEnvironment: {
      backendBaseUrl: string;
      frontendBaseUrl: string;
    };
  }
}
