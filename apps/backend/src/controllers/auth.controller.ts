import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import { authMiddleware, readLocalCredentialHeaders } from "../auth/middleware";
import type { AuthEnv } from "../auth/middleware";
import { readOAuthSession } from "../auth/wechat-session";
import { UserRepository } from "../repositories/UserRepository";
import { resolveUserByOpenId } from "../domains/pr-core/services/user-resolver.service";
import {
  ensureUserHasPin,
  verifyUserPin,
} from "../domains/pr-core/services/user-pin-auth.service";
import { issueAuthenticatedForUser } from "../auth/middleware";

const app = new Hono<AuthEnv>();
const userRepo = new UserRepository();

const authSessionSchema = z.object({
  userId: z.string().trim().min(1).optional().nullable(),
  userPin: z.string().regex(/^\d{4}$/).optional().nullable(),
});

export const authRoute = app
  .use("*", authMiddleware)
  .post("/session", zValidator("json", authSessionSchema), async (c) => {
    const auth = c.get("auth");
    if (auth.role === "authenticated" && auth.userId) {
      return c.json({
        role: "authenticated" as const,
        userId: auth.userId,
        userPin: null,
        accessToken: auth.token,
      });
    }

    const body = c.req.valid("json");
    const headerCreds = readLocalCredentialHeaders(c);

    const candidateUserId = body.userId ?? headerCreds.userId;
    const candidateUserPin = body.userPin ?? headerCreds.userPin;

    if (candidateUserId && candidateUserPin) {
      const localUser = await userRepo.findById(candidateUserId);
      if (!localUser || !(await verifyUserPin(localUser, candidateUserPin))) {
        throw new HTTPException(401, {
          message: "Invalid local user credentials",
        });
      }

      const authenticated = issueAuthenticatedForUser(localUser.id);
      c.set("auth", authenticated);
      return c.json({
        role: "authenticated" as const,
        userId: localUser.id,
        userPin: candidateUserPin,
        accessToken: authenticated.token,
      });
    }

    const oauthSession = await readOAuthSession(c);
    if (oauthSession) {
      const oauthUser = await resolveUserByOpenId(oauthSession.openId);
      const ensured = await ensureUserHasPin(oauthUser);
      const authenticated = issueAuthenticatedForUser(ensured.user.id);
      c.set("auth", authenticated);

      return c.json({
        role: "authenticated" as const,
        userId: ensured.user.id,
        userPin: ensured.userPin,
        accessToken: authenticated.token,
      });
    }

    return c.json({
      role: "anonymous" as const,
      userId: null,
      userPin: null,
      accessToken: auth.token,
    });
  });
