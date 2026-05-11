#!/usr/bin/env node

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";

const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "..");
const normalizeEnvKey = (key) =>
  process.platform === "win32" ? key.toUpperCase() : key;
const externalEnvKeys = new Set(Object.keys(process.env).map(normalizeEnvKey));

const workspaceEnvFiles = [
  "apps/frontend/.env",
  "apps/backend/.env",
];

const suites = {
  backend: {
    command: "test:scenario",
    filter: "@partner-up-dev/backend",
  },
  system: {
    command: "test:scenario:system",
    filter: null,
  },
};

function printUsage() {
  console.error("Usage: node scripts/run-scenario-tests.mjs [backend|system]");
}

function loadEnvFile(relativePath) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!existsSync(absolutePath)) {
    return;
  }

  const parsed = parseEnv(readFileSync(absolutePath, "utf8"));
  for (const [key, value] of Object.entries(parsed)) {
    if (!externalEnvKeys.has(normalizeEnvKey(key))) {
      process.env[key] = value;
    }
  }
}

function runPnpm(args, suiteName) {
  const useShell = process.platform === "win32";

  return new Promise((resolve) => {
    let child;
    try {
      child = spawn("pnpm", args, {
        cwd: repoRoot,
        env: process.env,
        shell: useShell,
        stdio: "inherit",
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[scenario:${suiteName}] failed to start pnpm: ${message}`);
      resolve(1);
      return;
    }

    child.on("error", (error) => {
      console.error(
        `[scenario:${suiteName}] failed to start pnpm: ${error.message}`,
      );
      resolve(1);
    });

    child.on("exit", (code, signal) => {
      if (signal) {
        console.error(`[scenario:${suiteName}] pnpm exited with signal ${signal}`);
        resolve(1);
        return;
      }

      resolve(code ?? 1);
    });
  });
}

async function runSuite(suiteName) {
  const suite = suites[suiteName];
  if (!suite) {
    return 1;
  }

  const args = suite.filter
    ? ["--filter", suite.filter, suite.command]
    : [suite.command];

  return runPnpm(args, suiteName);
}

for (const envFile of workspaceEnvFiles) {
  loadEnvFile(envFile);
}

const requestedSuiteNames = process.argv.slice(2);
const suiteNames =
  requestedSuiteNames.length > 0 ? requestedSuiteNames : Object.keys(suites);
const unknownSuiteNames = suiteNames.filter((suiteName) => !suites[suiteName]);

if (unknownSuiteNames.length > 0) {
  printUsage();
  process.exitCode = 1;
} else {
  for (const suiteName of suiteNames) {
    const exitCode = await runSuite(suiteName);
    if (exitCode !== 0) {
      process.exitCode = exitCode;
      break;
    }
  }
}
