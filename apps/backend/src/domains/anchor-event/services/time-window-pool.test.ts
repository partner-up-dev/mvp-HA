import assert from "node:assert/strict";
import test from "node:test";
import {
  eventOwnsTimeWindow,
  listAnchorEventTimeWindows,
} from "./time-window-pool";

test("eventOwnsTimeWindow accepts absolute rules with offset timestamps", () => {
  const event = {
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: null,
      startRules: [
        {
          id: "absolute-1",
          kind: "ABSOLUTE" as const,
          startAt: "2026-03-10T17:00:00+08:00",
        },
      ],
    },
  };

  const [timeWindow] = listAnchorEventTimeWindows(
    event,
    new Date("2026-03-01T00:00:00.000Z"),
  );

  assert.deepEqual(timeWindow, [
    "2026-03-10T09:00:00.000Z",
    "2026-03-10T10:00:00.000Z",
  ]);
  assert.equal(eventOwnsTimeWindow(event, timeWindow!), true);
});
