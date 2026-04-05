const FALLBACK_ERROR_MESSAGE = "Unknown error";

export const toErrorMessage = (error: unknown): string => {
  if (error instanceof AggregateError) {
    const nestedMessages = error.errors
      .map((nestedError) => toErrorMessage(nestedError))
      .filter((message) => message.length > 0);

    if (nestedMessages.length > 0) {
      return nestedMessages.join(" | ");
    }
  }

  if (error instanceof Error) {
    return error.message || error.name || FALLBACK_ERROR_MESSAGE;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  if (error === null || error === undefined) {
    return FALLBACK_ERROR_MESSAGE;
  }

  const fallbackMessage = String(error);
  return fallbackMessage.length > 0 ? fallbackMessage : FALLBACK_ERROR_MESSAGE;
};
