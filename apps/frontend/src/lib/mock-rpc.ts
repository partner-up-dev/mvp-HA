import { hc } from 'hono/client';
import type { AppType, PRId, PRStatus } from '@partner-up-dev/backend';

const MOCK_DELAY_MS = 1500; // Simulate network latency

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
                status: 'OPEN' as const,
                participants: 0,
                createdAt: new Date().toISOString(),
                parsed: {
                  title: `Request ${id}`,
                  scenario: 'Ã¦â€”â€¦Ã¨Â¡Å’',
                },
              })),
          } as Response;
        },
      },

      // Mock GET /api/pr/:id
      ':id': {
        $get: async ({ param }: { param: { id: PRId } }) => {
          await new Promise((resolve) => setTimeout(resolve, 500));

          return {
            ok: true,
            status: 200,
            json: async () => ({
              id: param.id,
              rawText: 'æˆ‘æƒ³æ‰¾äººä¸€èµ·åŽ»åŒ—äº¬æ—…è¡Œ',
              parsed: {
                scenario: 'æ—…è¡Œ',
                time: 'å‘¨æœ«',
                location: 'åŒ—äº¬',
                minParticipants: 2,
                maxParticipants: 4,
                budget: '1000',
                preferences: ['å–œæ¬¢æ‹ç…§'],
                notes: null,
              },
              status: 'OPEN',
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
    poster: {
      generate: {
        $post: async ({
          json,
        }: {
          json: {
            caption: string;
            style: string;
            ratio: string;
            saveOnServer?: boolean;
          };
        }) => {
          await new Promise((resolve) => setTimeout(resolve, 400));

          const posterUrl = json.saveOnServer
            ? "https://example.com/mock-poster.png"
            : "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=";

          return {
            ok: true,
            status: 200,
            json: async () => ({
              posterUrl,
              saved: Boolean(json.saveOnServer),
            }),
          } as Response;
        },
      },
    },
  },
} as unknown as ReturnType<typeof hc<AppType>>;

export { mockClient };
