import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../lib/env";
import {
  isAuthenticatedAuthRole,
  type AuthClaims,
  type AuthRole,
} from "./types";

const TOKEN_VERSION = "v1";

const encodeBase64Url = (value: string): string =>
  Buffer.from(value, "utf8").toString("base64url");

const decodeBase64Url = (value: string): string =>
  Buffer.from(value, "base64url").toString("utf8");

const sign = (payloadSegment: string): string => {
  return createHmac("sha256", env.AUTH_JWT_SECRET)
    .update(payloadSegment)
    .digest("base64url");
};

const parsePayload = (segment: string): AuthClaims | null => {
  try {
    const decoded = decodeBase64Url(segment);
    const parsed = JSON.parse(decoded) as unknown;
    if (typeof parsed !== "object" || parsed === null) return null;
    const claims = parsed as Partial<AuthClaims>;
    const role = claims.role;
    const exp = Number(claims.exp);
    const iat = Number(claims.iat);
    if (
      role !== "anonymous" &&
      role !== "authenticated" &&
      role !== "service"
    ) {
      return null;
    }
    if (claims.sub !== null && typeof claims.sub !== "string") return null;
    if (!Number.isInteger(exp) || !Number.isInteger(iat)) {
      return null;
    }
    return {
      role,
      sub: claims.sub ?? null,
      exp,
      iat,
    };
  } catch {
    return null;
  }
};

export const issueAccessToken = (
  role: AuthRole,
  userId: string | null,
  nowMs: number = Date.now(),
): string => {
  const nowSec = Math.floor(nowMs / 1000);
  const claims: AuthClaims = {
    role,
    sub: isAuthenticatedAuthRole(role) ? userId : null,
    iat: nowSec,
    exp: nowSec + env.AUTH_JWT_EXPIRES_SECONDS,
  };

  const payloadSegment = encodeBase64Url(JSON.stringify(claims));
  const versionSegment = TOKEN_VERSION;
  const signingInput = `${versionSegment}.${payloadSegment}`;
  const signature = sign(signingInput);
  return `${signingInput}.${signature}`;
};

export const verifyAccessToken = (
  token: string,
  nowMs: number = Date.now(),
): AuthClaims | null => {
  const segments = token.split(".");
  if (segments.length !== 3) return null;

  const [versionSegment, payloadSegment, signatureSegment] = segments;
  if (versionSegment !== TOKEN_VERSION) return null;

  const signingInput = `${versionSegment}.${payloadSegment}`;
  const expectedSignature = sign(signingInput);

  const providedBuffer = Buffer.from(signatureSegment);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (providedBuffer.length !== expectedBuffer.length) return null;
  if (!timingSafeEqual(providedBuffer, expectedBuffer)) return null;

  const claims = parsePayload(payloadSegment);
  if (!claims) return null;
  if (claims.exp <= Math.floor(nowMs / 1000)) return null;

  if (isAuthenticatedAuthRole(claims.role) && !claims.sub) {
    return null;
  }

  return claims;
};

export const shouldRenewAccessToken = (
  claims: AuthClaims,
  nowMs: number = Date.now(),
): boolean => {
  const nowSec = Math.floor(nowMs / 1000);
  return claims.exp - nowSec <= env.AUTH_JWT_RENEW_WINDOW_SECONDS;
};
