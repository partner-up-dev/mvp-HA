import assert from "node:assert/strict";
import { test } from "vitest";
import {
  eventOwnsTimeWindow,
  listAnchorEventTimeWindowDetails,
  listAnchorEventTimeWindows,
  resolveAnchorEventTimeWindowDescription,
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
          description: null,
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

test("listAnchorEventTimeWindowDetails carries start rule descriptions", () => {
  const event = {
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: null,
      startRules: [
        {
          id: "absolute-1",
          kind: "ABSOLUTE" as const,
          startAt: "2026-03-10T17:00:00+08:00",
          description: "下课正是运动好时候",
        },
      ],
    },
  };

  const [detail] = listAnchorEventTimeWindowDetails(
    event,
    new Date("2026-03-01T00:00:00.000Z"),
  );

  assert.deepEqual(detail, {
    key: "2026-03-10T09:00:00.000Z::2026-03-10T10:00:00.000Z",
    timeWindow: [
      "2026-03-10T09:00:00.000Z",
      "2026-03-10T10:00:00.000Z",
    ],
    description: "下课正是运动好时候",
  });
});

test("time window description uses first non-empty matching start rule", () => {
  const event = {
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: null,
      startRules: [
        {
          id: "absolute-empty",
          kind: "ABSOLUTE" as const,
          startAt: "2026-03-10T17:00:00+08:00",
          description: null,
        },
        {
          id: "absolute-described",
          kind: "ABSOLUTE" as const,
          startAt: "2026-03-10T17:00:00+08:00",
          description: "第一条有效说明",
        },
        {
          id: "absolute-later",
          kind: "ABSOLUTE" as const,
          startAt: "2026-03-10T17:00:00+08:00",
          description: "后续说明",
        },
      ],
    },
  };

  const description = resolveAnchorEventTimeWindowDescription(event, [
    "2026-03-10T09:00:00.000Z",
    "2026-03-10T10:00:00.000Z",
  ]);

  assert.equal(description, "第一条有效说明");
});
