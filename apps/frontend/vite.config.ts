import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import unocss from "unocss/vite";
import { resolve } from "path";
import { execSync } from "node:child_process";
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

const normalizeEnvValue = (value: string | undefined): string | null => {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const readGitValue = (command: string): string | null => {
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "ignore"],
      encoding: "utf8",
    });
    return normalizeEnvValue(output);
  } catch {
    return null;
  }
};

const normalizeRepositoryUrl = (value: string | null): string | null => {
  if (!value) return null;

  const withoutGitSuffix = value.replace(/\.git$/, "");
  const sshMatch = withoutGitSuffix.match(/^git@([^:]+):(.+)$/);
  if (sshMatch) {
    const host = sshMatch[1];
    const path = sshMatch[2];
    return `https://${host}/${path}`;
  }

  return withoutGitSuffix;
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const frontendCommitHash =
    normalizeEnvValue(env.VITE_FRONTEND_COMMIT_HASH) ??
    readGitValue("git rev-parse HEAD") ??
    "unknown";
  const repositoryUrl =
    normalizeRepositoryUrl(
      normalizeEnvValue(env.VITE_REPOSITORY_URL) ??
        readGitValue("git config --get remote.origin.url"),
    ) ??
    "";

  return {
    plugins: [
      jsoncPlugin(),
      deferCssPlugin(),
      unocss(),
      vue({
        template: {
          compilerOptions: {
            isCustomElement: (tag) => tag.startsWith("wx-open-"),
          },
        },
      }),
    ],
    define: {
      "import.meta.env.VITE_FRONTEND_COMMIT_HASH": JSON.stringify(
        frontendCommitHash,
      ),
      "import.meta.env.VITE_REPOSITORY_URL": JSON.stringify(repositoryUrl),
    },
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
            const hasStyleNamespaces =
              source.includes(`@use "@/styles/functions" as fn`) ||
              source.includes(`@use '@/styles/functions' as fn`) ||
              source.includes(`@use "@/styles/mixins" as mx`) ||
              source.includes(`@use '@/styles/mixins' as mx`);

            if (
              file.includes("src/components/") ||
              file.includes("src/pages/") ||
              file.includes("src/widgets/") ||
              file.includes("src/features/") ||
              file.includes("src/shared/") ||
              file.includes("src/domains/")
            ) {
              if (hasStyleNamespaces) {
                return source;
              }
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
