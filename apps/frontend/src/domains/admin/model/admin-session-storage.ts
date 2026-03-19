export type AdminSessionRole = "anonymous" | "service";

const STORAGE_ADMIN_USER_ID_KEY = "partner_up_admin_user_id";
const STORAGE_ADMIN_ACCESS_TOKEN_KEY = "partner_up_admin_access_token";
const STORAGE_ADMIN_SESSION_ROLE_KEY = "partner_up_admin_session_role";

let memoryAdminUserId: string | null = null;
let memoryAdminAccessToken: string | null = null;
let memoryAdminRole: AdminSessionRole = "anonymous";

const readStorage = (key: string): string | null => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const writeStorage = (key: string, value: string | null): void => {
  if (typeof window === "undefined") {
    return;
  }

  try {
    if (value === null) {
      window.localStorage.removeItem(key);
      return;
    }

    window.localStorage.setItem(key, value);
  } catch {
    // Ignore localStorage failures.
  }
};

const isAdminSessionRole = (value: string | null): value is AdminSessionRole =>
  value === "anonymous" || value === "service";

export const getStoredAdminUserId = (): string | null => {
  if (typeof window === "undefined") {
    return memoryAdminUserId;
  }

  return readStorage(STORAGE_ADMIN_USER_ID_KEY);
};

export const setStoredAdminUserId = (userId: string | null): void => {
  memoryAdminUserId = userId;
  writeStorage(STORAGE_ADMIN_USER_ID_KEY, userId);
};

export const getStoredAdminAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return memoryAdminAccessToken;
  }

  return readStorage(STORAGE_ADMIN_ACCESS_TOKEN_KEY);
};

export const setStoredAdminAccessToken = (accessToken: string | null): void => {
  memoryAdminAccessToken = accessToken;
  writeStorage(STORAGE_ADMIN_ACCESS_TOKEN_KEY, accessToken);
};

export const getStoredAdminSessionRole = (): AdminSessionRole => {
  if (typeof window === "undefined") {
    return memoryAdminRole;
  }

  const raw = readStorage(STORAGE_ADMIN_SESSION_ROLE_KEY);
  return isAdminSessionRole(raw) ? raw : "anonymous";
};

export const setStoredAdminSessionRole = (role: AdminSessionRole): void => {
  memoryAdminRole = role;
  writeStorage(STORAGE_ADMIN_SESSION_ROLE_KEY, role);
};

export const clearStoredAdminSession = (): void => {
  memoryAdminUserId = null;
  memoryAdminAccessToken = null;
  memoryAdminRole = "anonymous";

  writeStorage(STORAGE_ADMIN_USER_ID_KEY, null);
  writeStorage(STORAGE_ADMIN_ACCESS_TOKEN_KEY, null);
  writeStorage(STORAGE_ADMIN_SESSION_ROLE_KEY, null);
};

export const getStoredAdminHasAccess = (): boolean =>
  getStoredAdminSessionRole() === "service" &&
  Boolean(getStoredAdminUserId()) &&
  Boolean(getStoredAdminAccessToken());
