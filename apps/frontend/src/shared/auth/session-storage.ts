export type SessionRole = "anonymous" | "authenticated";

const STORAGE_USER_ID_KEY = "partner_up_user_id";
const STORAGE_USER_PIN_KEY = "partner_up_user_pin";
const STORAGE_ACCESS_TOKEN_KEY = "partner_up_access_token";
const STORAGE_SESSION_ROLE_KEY = "partner_up_session_role";

let memoryUserId: string | null = null;
let memoryUserPin: string | null = null;
let memoryAccessToken: string | null = null;
let memoryRole: SessionRole = "anonymous";

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

export const getStoredUserId = (): string | null => {
  if (typeof window === "undefined") {
    return memoryUserId;
  }
  return readStorage(STORAGE_USER_ID_KEY);
};

export const setStoredUserId = (userId: string | null): void => {
  memoryUserId = userId;
  writeStorage(STORAGE_USER_ID_KEY, userId);
};

export const getStoredUserPin = (): string | null => {
  if (typeof window === "undefined") {
    return memoryUserPin;
  }
  return readStorage(STORAGE_USER_PIN_KEY);
};

export const setStoredUserPin = (userPin: string | null): void => {
  memoryUserPin = userPin;
  writeStorage(STORAGE_USER_PIN_KEY, userPin);
};

export const getStoredAccessToken = (): string | null => {
  if (typeof window === "undefined") {
    return memoryAccessToken;
  }
  return readStorage(STORAGE_ACCESS_TOKEN_KEY);
};

export const setStoredAccessToken = (accessToken: string | null): void => {
  memoryAccessToken = accessToken;
  writeStorage(STORAGE_ACCESS_TOKEN_KEY, accessToken);
};

const isSessionRole = (value: string | null): value is SessionRole =>
  value === "anonymous" || value === "authenticated";

export const getStoredSessionRole = (): SessionRole => {
  if (typeof window === "undefined") {
    return memoryRole;
  }

  const raw = readStorage(STORAGE_SESSION_ROLE_KEY);
  return isSessionRole(raw) ? raw : "anonymous";
};

export const setStoredSessionRole = (role: SessionRole): void => {
  memoryRole = role;
  writeStorage(STORAGE_SESSION_ROLE_KEY, role);
};
