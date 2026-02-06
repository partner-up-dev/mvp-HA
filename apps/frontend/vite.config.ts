import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import unocss from "unocss/vite";
import { resolve } from "path";
import { parse as parseJsonc } from "jsonc-parser";

const jsoncPlugin = () => ({
  name: "jsonc-loader",
  transform(source: string, id: string) {
    if (!id.endsWith(".jsonc")) {
      return null;
    }

    const parsed = parseJsonc(source);
    return {
      code: `export default ${JSON.stringify(parsed)};`,
      map: null,
    };
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [jsoncPlugin(), unocss(), vue()],
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
          target: `http://localhost:${env.VITE_BACKEND_PORT || 3000}`,
          changeOrigin: true,
        },
      },
    },
  };
});
