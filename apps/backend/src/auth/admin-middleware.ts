import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  attachAuthTokenHeader,
  resolveRequestAuth,
  type AuthEnv,
} from "./middleware";

export type AdminAuthEnv = AuthEnv;

export const adminAuthMiddleware: MiddlewareHandler<AdminAuthEnv> = async (
  c,
  next,
) => {
  const auth = resolveRequestAuth(c);
  if (auth.role !== "service" || !auth.userId) {
    throw new HTTPException(401, { message: "Admin authorization required" });
  }

  c.set("auth", auth);
  await next();
  attachAuthTokenHeader(c, c.get("auth").token);
};
