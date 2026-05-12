import { createTelemetryId } from "@/shared/telemetry/journey";

export const CORRELATION_ID_HEADER = "x-correlation-id";

export const createCommandCorrelationId = (): string => createTelemetryId();

export const buildCorrelationHeaders = (
  correlationId: string | undefined,
): Record<string, string> => {
  if (!correlationId) return {};
  return {
    [CORRELATION_ID_HEADER]: correlationId,
  };
};
