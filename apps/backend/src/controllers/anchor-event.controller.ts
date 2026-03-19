import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  listAnchorEvents,
  getAnchorEventDetail,
  createUserAnchorPR,
  checkUserAnchorPRAvailability,
  AnchorEventNotFoundError,
  AnchorEventBatchNotFoundError,
  UserCreationLocationUnavailableError,
  LocationCapReachedError,
  joinDemandCard,
  demandCardJoinErrorCode,
} from "../domains/anchor-event";
import { authMiddleware, type AuthEnv } from "../auth/middleware";
import { requireAuthenticatedOpenId } from "./pr-controller.shared";

const app = new Hono<AuthEnv>();

const eventIdParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
});

const eventBatchParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  batchId: z.coerce.number().int().positive(),
});

const demandCardJoinParamSchema = z.object({
  eventId: z.coerce.number().int().positive(),
  cardKey: z.string().trim().min(1).max(256),
});

const userCreateAnchorPRInputSchema = z.object({
  locationId: z.string().trim().min(1),
});

const demandCardJoinBodySchema = z.object({
  batchId: z.coerce.number().int().positive(),
  displayLocationName: z.string().trim().min(1),
  timeWindow: z.tuple([z.string().nullable(), z.string().nullable()]),
  preferenceFingerprint: z.string().trim().min(1).nullable().optional(),
});

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  [key: string]: unknown;
};

const problem = (payload: ProblemDetails): Response =>
  new Response(JSON.stringify(payload), {
    status: payload.status,
    headers: {
      "Content-Type": "application/problem+json",
    },
  });

const mapCreateAPRAvailabilityProblem = (
  error: unknown,
  instance: string,
): Response | null => {
  if (error instanceof AnchorEventNotFoundError) {
    return problem({
      type: "https://partnerup.sh/problems/anchor-event-not-found",
      title: "Anchor event not found",
      status: 404,
      detail: "Anchor event not found.",
      instance,
      code: "ANCHOR_EVENT_NOT_FOUND",
      eventId: error.eventId,
    });
  }

  if (error instanceof AnchorEventBatchNotFoundError) {
    return problem({
      type: "https://partnerup.sh/problems/anchor-event-batch-not-found",
      title: "Anchor event batch not found",
      status: 404,
      detail: "Anchor event batch not found.",
      instance,
      code: "ANCHOR_EVENT_BATCH_NOT_FOUND",
      batchId: error.batchId,
    });
  }

  if (error instanceof UserCreationLocationUnavailableError) {
    return problem({
      type: "https://partnerup.sh/problems/anchor-location-not-available",
      title: "Selected location unavailable",
      status: 400,
      detail: "Selected location is not available for user creation.",
      instance,
      code: "INVALID_LOCATION",
      locationId: error.locationId,
    });
  }

  if (error instanceof LocationCapReachedError) {
    return problem({
      type: "https://partnerup.sh/problems/anchor-location-cap-reached",
      title: "Location creation quota reached",
      status: 409,
      detail: "The selected location has reached the per-batch PR limit.",
      instance,
      code: "LOCATION_CAP_REACHED",
      locationId: error.locationId,
    });
  }

  return null;
};

export const anchorEventRoute = app
  .use("*", authMiddleware)
  // GET /api/events - List all active anchor events (Event Plaza)
  .get("/", async (c) => {
    const events = await listAnchorEvents();
    return c.json(events);
  })
  // GET /api/events/:eventId - Get anchor event detail with batches & PRs
  .get("/:eventId", zValidator("param", eventIdParamSchema), async (c) => {
    const { eventId } = c.req.valid("param");
    const detail = await getAnchorEventDetail(eventId);
    return c.json(detail);
  })
  .post(
    "/:eventId/demand-cards/:cardKey/join",
    zValidator("param", demandCardJoinParamSchema),
    zValidator("json", demandCardJoinBodySchema),
    async (c) => {
      const { eventId, cardKey } = c.req.valid("param");
      const {
        batchId,
        displayLocationName,
        timeWindow,
        preferenceFingerprint,
      } = c.req.valid("json");

      let openId: string;
      try {
        openId = await requireAuthenticatedOpenId(c);
      } catch (error) {
        if (error instanceof HTTPException && error.status === 401) {
          return problem({
            type: "https://partnerup.sh/problems/wechat-auth-required",
            title: "WeChat authentication required",
            status: 401,
            detail: "Please complete WeChat login before joining this demand card.",
            instance: c.req.path,
            code: "WECHAT_AUTH_REQUIRED",
          });
        }
        throw error;
      }

      try {
        const result = await joinDemandCard({
          eventId,
          cardKey,
          batchId,
          displayLocationName,
          timeWindow,
          preferenceFingerprint: preferenceFingerprint ?? null,
          openId,
        });
        return c.json(result);
      } catch (error) {
        if (
          error instanceof HTTPException &&
          typeof (error as { code?: string }).code === "string" &&
          (error as { code?: string }).code ===
            demandCardJoinErrorCode.NO_JOINABLE_CANDIDATE
        ) {
          return problem({
            type: "https://partnerup.sh/problems/no-joinable-anchor-candidate",
            title: "No joinable Anchor PR candidate",
            status: 409,
            detail:
              "No joinable Anchor PR currently matches this demand card.",
            instance: c.req.path,
            code: demandCardJoinErrorCode.NO_JOINABLE_CANDIDATE,
            cardKey,
          });
        }
        throw error;
      }
    },
  )
  // POST /api/events/:eventId/batches/:batchId/anchor-prs - Create user-managed anchor PR
  .post(
    "/:eventId/batches/:batchId/anchor-prs",
    zValidator("param", eventBatchParamSchema),
    zValidator("json", userCreateAnchorPRInputSchema),
    async (c) => {
      const { eventId, batchId } = c.req.valid("param");
      const { locationId } = c.req.valid("json");

      const availabilityProblem = await (async (): Promise<Response | null> => {
        try {
          await checkUserAnchorPRAvailability({
            eventId,
            batchId,
            locationId,
          });
          return null;
        } catch (error) {
          return mapCreateAPRAvailabilityProblem(error, c.req.path);
        }
      })();
      if (availabilityProblem) {
        return availabilityProblem;
      }

      let openId: string;
      try {
        openId = await requireAuthenticatedOpenId(c);
      } catch (error) {
        if (
          error instanceof HTTPException &&
          (error.status === 401 || error.status === 503)
        ) {
          const code =
            typeof (error as { code?: string }).code === "string"
              ? (error as { code?: string }).code!
              : error.status === 401
                ? "WECHAT_AUTH_REQUIRED"
                : "WECHAT_OAUTH_NOT_CONFIGURED";

          return problem({
            type:
              error.status === 401
                ? "https://partnerup.sh/problems/wechat-auth-required"
                : "https://partnerup.sh/problems/wechat-oauth-not-configured",
            title:
              error.status === 401
                ? "WeChat authentication required"
                : "WeChat OAuth not configured",
            status: error.status,
            detail:
              error.status === 401
                ? "Please complete WeChat login before creating Anchor PR."
                : "Current environment does not have WeChat OAuth configured.",
            instance: c.req.path,
            code,
          });
        }
        throw error;
      }

      try {
        const result = await createUserAnchorPR({
          eventId,
          batchId,
          locationId,
          openId,
        });
        return c.json(result, 201);
      } catch (error) {
        const mapped = mapCreateAPRAvailabilityProblem(error, c.req.path);
        if (mapped) {
          return mapped;
        }
        throw error;
      }
    },
  );
