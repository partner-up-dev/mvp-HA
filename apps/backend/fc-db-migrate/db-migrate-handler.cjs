"use strict";

const path = require("node:path");
const { pathToFileURL } = require("node:url");

const readRequiredEnv = (name) => {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

exports.handler = async function handler() {
  const packageRoot = __dirname;
  process.env.DB_SCRIPT_ROOT = packageRoot;

  const databaseUrl = readRequiredEnv("DATABASE_URL");
  const moduleUrl = pathToFileURL(path.join(packageRoot, "db-migrate.js")).href;
  const { runMigrations } = await import(moduleUrl);

  await runMigrations(databaseUrl);

  return {
    ok: true,
    packageRoot,
  };
};
