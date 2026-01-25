import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import { resolve } from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [vue()],
    build: {
      outDir: "./dist",
    },
    resolve: {
      alias: {
        "@": resolve(__dirname, "src"),
      },
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: (source, file) => {
            if (
              file.includes("src/components/") ||
              file.includes("src/pages/")
            ) {
              return `@use "@/styles/functions" as fn; @use "@/styles/mixins" as mx;${source}`;
            }
            return source;
          },
        },
      },
    },
    server: {
      port: parseInt(env.VITE_PORT) || 5173,
      proxy: {
        "/api": {
          target: `http://localhost:${env.BACKEND_PORT || 3000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
