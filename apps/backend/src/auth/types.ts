export type AuthRole = "anonymous" | "authenticated";

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
