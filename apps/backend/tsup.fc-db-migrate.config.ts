import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    "db-migrate": "src/scripts/db/migrate.ts",
  },
  outDir: "dist-fc-db-migrate",
  format: ["esm"],
  platform: "node",
  target: "node20",
  sourcemap: true,
  clean: true,
  bundle: true,
  splitting: false,
  noExternal: [/.*/],
});
