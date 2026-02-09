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

const deferCssPlugin = () => ({
  name: "defer-css",
  apply: "build",
  transformIndexHtml(html: string) {
    const stylesheetRegex = /<link\b([^>]*?)rel=["']stylesheet["']([^>]*?)>/gi;

    return html.replace(stylesheetRegex, (match) => {
      const attrs = match
        .replace(/^<link\s*/i, "")
        .replace(/\/>$/i, "")
        .replace(/>$/i, "")
        .trim();
      const hrefMatch = attrs.match(/\bhref=["']([^"']+)["']/i);

      if (!hrefMatch) {
        return match;
      }

      const href = hrefMatch[1];
      const rest = attrs
        .replace(/\brel=["']stylesheet["']\s*/i, "")
        .replace(/\bhref=["'][^"']+["']\s*/i, "")
        .trim();
      const extra = rest.length > 0 ? ` ${rest}` : "";

      const preload = `<link rel="preload" as="style" href="${href}" onload="this.onload=null;this.rel='stylesheet'"${extra}>`;
      const noscript = `<noscript><link rel="stylesheet" href="${href}"${extra}></noscript>`;

      return `${preload}${noscript}`;
    });
  },
});

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  return {
    plugins: [jsoncPlugin(), deferCssPlugin(), unocss(), vue()],
    build: {
      outDir: "./dist",
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules")) {
              return "vendor";
            }

            if (
              id.includes("src/components/share/") ||
              id.includes("src/composables/useGeneratePoster") ||
              id.includes("src/composables/useGenerateWechatThumbPoster") ||
              id.includes("src/composables/renderHtmlPoster") ||
              id.includes("src/lib/poster-types")
            ) {
              return "share";
            }

            return undefined;
          },
        },
      },
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
