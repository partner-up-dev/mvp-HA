import { hc } from "hono/client";
import type { AppType, PRId, PRStatus } from "@partner-up-dev/backend";

const MOCK_DELAY_MS = 1500; // Simulate network latency

let xhsPosterCache: {
  prId: PRId;
  caption: string;
  posterStylePrompt: string;
  posterUrl: string;
} | null = null;

let wechatThumbnailCache: {
  prId: PRId;
  style: number;
  posterUrl: string;
} | null = null;

const mockClient = {
  api: {
    pr: {
      // Mock POST /api/pr
      $post: async ({ json }: { json: { rawText: string; pin: string } }) => {
        await new Promise((resolve) => setTimeout(resolve, MOCK_DELAY_MS));

        const mockId = Math.floor(Math.random() * 100000) + 1;
        return {
          ok: true,
          status: 201,
          json: async () => ({ id: mockId }),
        } as Response;
      },

      // Mock POST /api/pr/batch
      batch: {
        $post: async ({ json }: { json: { ids: PRId[] } }) => {
          await new Promise((resolve) => setTimeout(resolve, 500));

          return {
            ok: true,
            status: 200,
            json: async () =>
              json.ids.map((id) => ({
                id,
                status: "OPEN" as const,
                participants: 0,
                createdAt: new Date().toISOString(),
                parsed: {
                  title: `Request ${id}`,
                  scenario: "weekend",
                },
              })),
          } as Response;
        },
      },

      // Mock GET /api/pr/:id
      ":id": {
        $get: async ({ param }: { param: { id: PRId } }) => {
          await new Promise((resolve) => setTimeout(resolve, 500));

          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: param.id,
              rawText: "Let's find someone for a weekend trip",
              parsed: {
                scenario: "weekend",
                time: "this weekend",
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                location: "beijing",
                minParticipants: 2,
                maxParticipants: 4,
                budget: "1000",
                preferences: ["photo"],
                notes: null,
              },
              status: "OPEN",
              createdAt: new Date().toISOString(),
            }),
          } as Response;
        },

        // Mock PATCH /api/pr/:id/status
        status: {
          $patch: async ({
            param,
            json,
          }: {
            param: { id: PRId };
            json: { status: PRStatus };
          }) => {
            await new Promise((resolve) => setTimeout(resolve, 500));

            return {
              ok: true,
              status: 200,
              json: async () => ({ id: param.id, status: json.status }),
            } as Response;
          },
        },
      },
    },
    llm: {
      "xiaohongshu-caption": {
        $post: async ({
          json,
          query,
        }: {
          json: { prId: PRId };
          query?: { style?: string };
        }) => {
          await new Promise((resolve) => setTimeout(resolve, 600));

          const styleHint = query?.style ? `#${query.style}` : "";
          return {
            ok: true,
            status: 200,
            json: async () => ({ caption: `周末一起出发${styleHint}` }),
          } as Response;
        },
      },
    },
    share: {
      xiaohongshu: {
        "poster-html": {
          $post: async ({
            json,
          }: {
            json: { prId: PRId; caption: string; posterStylePrompt: string };
          }) => {
            await new Promise((resolve) => setTimeout(resolve, 700));

            const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body{margin:0;}
    #poster-root{width:720px;height:1080px;display:flex;align-items:center;justify-content:center;background:#F7F7F8;font-family:PingFang SC, system-ui, sans-serif;}
    .box{width:640px;padding:56px;border-radius:28px;background:#fff;border:2px solid #E5E7EB;}
    .t{font-size:64px;font-weight:700;color:#111827;line-height:1.2;white-space:pre-line;}
  </style>
</head>
<body>
  <div id="poster-root"><div class="box"><div class="t">${json.caption}</div></div></div>
</body>
</html>`;

            return {
              ok: true,
              status: 200,
              json: async () => ({ html, width: 720, height: 1080 }),
            } as Response;
          },
        },
        "get-cached-poster": {
          $post: async ({
            json,
          }: {
            json: { prId: PRId; caption: string; posterStylePrompt: string };
          }) => {
            await new Promise((resolve) => setTimeout(resolve, 250));

            const posterUrl =
              xhsPosterCache &&
              xhsPosterCache.prId === json.prId &&
              xhsPosterCache.caption === json.caption &&
              xhsPosterCache.posterStylePrompt === json.posterStylePrompt
                ? xhsPosterCache.posterUrl
                : null;

            return {
              ok: true,
              status: 200,
              json: async () => ({ posterUrl }),
            } as Response;
          },
        },
        "cache-poster": {
          $post: async ({
            json,
          }: {
            json: {
              prId: PRId;
              caption: string;
              posterStylePrompt: string;
              posterUrl: string;
            };
          }) => {
            await new Promise((resolve) => setTimeout(resolve, 250));

            xhsPosterCache = {
              prId: json.prId,
              caption: json.caption,
              posterStylePrompt: json.posterStylePrompt,
              posterUrl: json.posterUrl,
            };

            return {
              ok: true,
              status: 200,
              json: async () => ({ success: true }),
            } as Response;
          },
        },
      },
      "wechat-card": {
        "thumbnail-html": {
          $post: async ({ json }: { json: { prId: PRId; style?: number } }) => {
            await new Promise((resolve) => setTimeout(resolve, 700));

            const keyText = "搭";
            const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body{margin:0;}
    #poster-root{width:300px;height:300px;display:flex;align-items:center;justify-content:center;background:#F7F7F8;font-family:PingFang SC, system-ui, sans-serif;border-radius:24px;}
    .t{font-size:120px;font-weight:800;color:#111827;}
  </style>
</head>
<body>
  <div id="poster-root"><div class="t">${keyText}</div></div>
</body>
</html>`;

            return {
              ok: true,
              status: 200,
              json: async () => ({
                html,
                width: 300,
                height: 300,
                meta: { keyText },
              }),
            } as Response;
          },
        },
        "get-cached-thumbnail": {
          $post: async ({ json }: { json: { prId: PRId; style: number } }) => {
            await new Promise((resolve) => setTimeout(resolve, 250));

            const posterUrl =
              wechatThumbnailCache &&
              wechatThumbnailCache.prId === json.prId &&
              wechatThumbnailCache.style === json.style
                ? wechatThumbnailCache.posterUrl
                : null;

            return {
              ok: true,
              status: 200,
              json: async () => ({ posterUrl }),
            } as Response;
          },
        },
        "cache-thumbnail": {
          $post: async ({
            json,
          }: {
            json: { prId: PRId; style: number; posterUrl: string };
          }) => {
            await new Promise((resolve) => setTimeout(resolve, 250));

            wechatThumbnailCache = {
              prId: json.prId,
              style: json.style,
              posterUrl: json.posterUrl,
            };

            return {
              ok: true,
              status: 200,
              json: async () => ({ success: true }),
            } as Response;
          },
        },
      },
    },
  },
} as unknown as ReturnType<typeof hc<AppType>>;

export { mockClient };
