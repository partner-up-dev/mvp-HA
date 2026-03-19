import type { Context, MiddlewareHandler } from "hono";
import type { User, UserId, UserRole } from "../entities/user";
import {
  isAuthenticatedAuthRole,
  type AuthenticatedAuthRole,
  type RequestAuth,
} from "./types";
import {
  issueAccessToken,
  shouldRenewAccessToken,
  verifyAccessToken,
} from "./jwt";

const ACCESS_TOKEN_HEADER = "x-access-token";
const AUTH_HEADER_PREFIX = "Bearer ";

export type AuthEnv = {
  Variables: {
    auth: RequestAuth;
  };
};

const readBearerToken = (c: Context): string | null => {
  const authHeader = c.req.header("authorization") ?? c.req.header("Authorization");
  if (!authHeader?.startsWith(AUTH_HEADER_PREFIX)) return null;
  const token = authHeader.slice(AUTH_HEADER_PREFIX.length).trim();
  return token.length > 0 ? token : null;
};

const mapUserRoleToAuthRole = (role: UserRole): AuthenticatedAuthRole =>
  role === "service" ? "service" : "authenticated";

const buildAnonymousAuth = (): RequestAuth => {
  const token = issueAccessToken("anonymous", null);
  const claims = verifyAccessToken(token);
  if (!claims) {
    throw new Error("Failed to issue anonymous access token");
  }
  return {
    role: "anonymous",
    userId: null,
    token,
    claims,
  };
};

const issueRoleAuth = (
  userId: UserId,
  role: AuthenticatedAuthRole,
): RequestAuth => {
  const token = issueAccessToken(role, userId);
  const claims = verifyAccessToken(token);
  if (!claims) {
    throw new Error(`Failed to issue ${role} access token`);
  }
  return {
    role,
    userId,
    token,
    claims,
  };
};

export const resolveRequestAuth = (c: Context): RequestAuth => {
  const bearer = readBearerToken(c);
  if (!bearer) {
    return buildAnonymousAuth();
  }

  const claims = verifyAccessToken(bearer);
  if (!claims) {
    return buildAnonymousAuth();
  }

  if (isAuthenticatedAuthRole(claims.role) && claims.sub) {
    if (shouldRenewAccessToken(claims)) {
      return issueRoleAuth(claims.sub as UserId, claims.role);
    }

    return {
      role: claims.role,
      userId: claims.sub as UserId,
      token: bearer,
      claims,
    };
  }

  if (shouldRenewAccessToken(claims)) {
    return buildAnonymousAuth();
  }

  return {
    role: "anonymous",
    userId: null,
    token: bearer,
    claims,
  };
};

export const authMiddleware: MiddlewareHandler<AuthEnv> = async (c, next) => {
  const auth = resolveRequestAuth(c);
  c.set("auth", auth);

  await next();

  const latestAuth = c.get("auth");
  c.header(ACCESS_TOKEN_HEADER, latestAuth.token);
};

export const attachAuthTokenHeader = (c: Context, token: string): void => {
  c.header(ACCESS_TOKEN_HEADER, token);
};

export const issueAnonymousAuth = (): RequestAuth => buildAnonymousAuth();

export const issueUserAuth = (userId: UserId): RequestAuth =>
  issueRoleAuth(userId, "authenticated");

export const issueAuthForUser = (user: Pick<User, "id" | "role">): RequestAuth =>
  issueRoleAuth(user.id, mapUserRoleToAuthRole(user.role));

export const readLocalCredentialHeaders = (c: Context): {
  userId: string | null;
  userPin: string | null;
} => {
  const userId = (c.req.header("x-user-id") ?? "").trim();
  const userPin = (c.req.header("x-user-pin") ?? "").trim();

  return {
    userId: userId.length > 0 ? userId : null,
    userPin: userPin.length > 0 ? userPin : null,
  };
};
