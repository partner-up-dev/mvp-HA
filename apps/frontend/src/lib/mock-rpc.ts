import { hc } from "hono/client";
import type { AppType, PRStatus, PRId } from "@partner-up-dev/backend";

const MOCK_DELAY_MS = 1500; // Simulate network latency

// Helper to create mock SSE stream
const createMockStream = <T>(data: T[]) => {
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for (const item of data) {
        await new Promise((resolve) => setTimeout(resolve, 300)); // Simulate streaming delay
        const chunk = `data: ${JSON.stringify(item)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
};

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

      // Mock POST /api/pr/parse-stream (NEW)
      "parse-stream": {
        $post: async ({ json }: { json: { rawText: string } }) => {
          // Simulate streaming partial results
          const mockPartials = [
            { scenario: "旅行" },
            { scenario: "旅行", time: "周末" },
            { scenario: "旅行", time: "周末", location: "杭州" },
            {
              scenario: "旅行",
              time: "周末",
              location: "杭州",
              minParticipants: 2,
            },
            {
              scenario: "旅行",
              time: "周末",
              location: "杭州",
              minParticipants: 2,
              maxParticipants: 4,
              budget: "500",
            },
            {
              scenario: "旅行",
              time: "周末",
              location: "杭州",
              minParticipants: 2,
              maxParticipants: 4,
              budget: "500",
              preferences: ["爬山"],
              notes: null,
            },
          ];

          return {
            ok: true,
            status: 200,
            body: createMockStream(mockPartials),
            headers: new Headers({
              "Content-Type": "text/event-stream",
            }),
          } as Response;
        },
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
                  scenario: "æ—…è¡Œ",
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
              rawText: "我想找人一起去北京旅行",
              parsed: {
                scenario: "旅行",
                time: "周末",
                location: "北京",
                minParticipants: 2,
                maxParticipants: 4,
                budget: "1000",
                preferences: ["喜欢拍照"],
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
  },
} as unknown as ReturnType<typeof hc<AppType>>;

export { mockClient };
