import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { HTTPException } from "hono/http-exception";
import {
  authMiddleware,
  issueAnonymousAuth,
  issueAuthForUser,
  readLocalCredentialHeaders,
} from "../auth/middleware";
import type { AuthEnv } from "../auth/middleware";
import { UserRepository } from "../repositories/UserRepository";
import { verifyUserPin } from "../domains/pr-core/services/user-pin-auth.service";
import { registerLocalUser } from "../domains/user/use-cases/register-local-user";
import { registerAnonymousUser } from "../domains/user/use-cases/register-anonymous-user";
import {
  clearAnonymousSessionCookie,
  setAnonymousSessionCookie,
} from "../auth/anonymous-session";

const app = new Hono<AuthEnv>();
const userRepo = new UserRepository();

const authSessionSchema = z.object({
  userId: z.string().trim().min(1).optional().nullable(),
  userPin: z
    .string()
    .regex(/^\d{4}$/)
    .optional()
    .nullable(),
});

const adminLoginSchema = z.object({
  userId: z.string().uuid(),
  password: z.string().min(1),
});

export const authRoute = app
  .use("*", authMiddleware)
  .post("/admin/login", zValidator("json", adminLoginSchema), async (c) => {
    const { userId, password } = c.req.valid("json");
    const user = await userRepo.findById(userId);
    if (
      !user ||
      user.role !== "service" ||
      !(await verifyUserPin(user, password))
    ) {
      throw new HTTPException(401, { message: "Invalid admin credentials" });
    }

    const authenticated = issueAuthForUser(user);
    c.set("auth", authenticated);
    return c.json({
      role: authenticated.role,
      userId: user.id,
      userPin: null,
      accessToken: authenticated.token,
    });
  })
  .post("/register/local", async (c) => {
    const auth = c.get("auth");
    if (auth.role !== "anonymous" || auth.userId) {
      return c.json({
        role: auth.role,
        userId: auth.userId,
        userPin: null,
        accessToken: auth.token,
      });
    }

    const registered = await registerLocalUser();
    return c.json(registered);
  })
  .post("/register/anonymous", async (c) => {
    const auth = c.get("auth");
    if (auth.role === "anonymous" && auth.userId) {
      await setAnonymousSessionCookie(c, auth.userId);
      return c.json({
        role: "anonymous",
        userId: auth.userId,
        userPin: null,
        accessToken: auth.token,
      });
    }

    const registered = await registerAnonymousUser();
    await setAnonymousSessionCookie(c, registered.userId);

    return c.json(registered);
  })
  .post("/session", zValidator("json", authSessionSchema), async (c) => {
    const auth = c.get("auth");
    if (auth.role !== "anonymous" && auth.userId) {
      return c.json({
        role: auth.role,
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

      const authenticated = issueAuthForUser(localUser);
      c.set("auth", authenticated);
      return c.json({
        role: authenticated.role,
        userId: localUser.id,
        userPin: localUser.role === "service" ? null : candidateUserPin,
        accessToken: authenticated.token,
      });
    }

    if (auth.role === "anonymous" && auth.userId) {
      return c.json({
        role: auth.role,
        userId: auth.userId,
        userPin: null,
        accessToken: auth.token,
      });
    }

    const anonymous = issueAnonymousAuth(null);
    return c.json({
      role: "anonymous" as const,
      userId: null,
      userPin: null,
      accessToken: anonymous.token,
    });
  });
