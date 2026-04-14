import {
  NO_LATE_TOLERANCE_UNITS,
  type ScheduleOnceConfig,
} from "../jobs";

export type JobSchedulePolicy = Pick<
  ScheduleOnceConfig,
  "resolutionMs" | "earlyToleranceUnits" | "lateToleranceUnits"
>;

const SECOND_RESOLUTION_MS = 1_000;
const FIVE_MINUTE_RESOLUTION_MS = 5 * 60 * 1_000;

export const confirmationReminderSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: FIVE_MINUTE_RESOLUTION_MS,
  earlyToleranceUnits: 3,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const activityStartReminderSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const bookingResultSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const newPartnerSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};

export const prMessageSchedulePolicy: JobSchedulePolicy = {
  resolutionMs: SECOND_RESOLUTION_MS,
  earlyToleranceUnits: 0,
  lateToleranceUnits: NO_LATE_TOLERANCE_UNITS,
};
