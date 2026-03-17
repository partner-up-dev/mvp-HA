export type ApiErrorPayload = {
  error?: string;
  detail?: string;
  code?: string;
};

export const readApiErrorPayload = async (
  response: Response,
): Promise<ApiErrorPayload | null> => {
  try {
    return (await response.json()) as ApiErrorPayload;
  } catch {
    return null;
  }
};

export const resolveApiErrorMessage = (
  payload: ApiErrorPayload | null,
  fallback: string,
): string => {
  return payload?.detail ?? payload?.error ?? fallback;
};
