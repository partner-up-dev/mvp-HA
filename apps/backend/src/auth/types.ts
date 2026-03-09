export type AuthRole = "anonymous" | "authenticated" | "service";
export type AuthenticatedAuthRole = Exclude<AuthRole, "anonymous">;

export const isAuthenticatedAuthRole = (
  role: AuthRole,
): role is AuthenticatedAuthRole => role !== "anonymous";

export type AuthClaims = {
  role: AuthRole;
  sub: string | null;
  exp: number;
  iat: number;
};

export type RequestAuth = {
  role: AuthRole;
  userId: string | null;
  token: string;
  claims: AuthClaims;
};
