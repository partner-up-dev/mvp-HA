import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import {
  attachAuthTokenHeader,
  resolveRequestAuth,
  type AuthEnv,
} from "./middleware";
import { hasAnyAuthRole, type AuthRole } from "./types";

export type AdminAuthEnv = AuthEnv;

export const requireRoles =
  (requiredRoles: readonly AuthRole[]): MiddlewareHandler<AdminAuthEnv> =>
  async (c, next) => {
    const auth = resolveRequestAuth(c);
    if (!auth.userId || !hasAnyAuthRole(auth.roles, requiredRoles)) {
      throw new HTTPException(401, { message: "Authorization required" });
    }

    c.set("auth", auth);
    await next();
    attachAuthTokenHeader(c, c.get("auth").token);
  };

export const adminAuthMiddleware: MiddlewareHandler<AdminAuthEnv> =
  requireRoles(["service"]);

export const analyticsAuthMiddleware: MiddlewareHandler<AdminAuthEnv> =
  requireRoles(["analytics"]);
