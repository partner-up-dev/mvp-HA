import assert from "node:assert/strict";
import { test } from "vitest";
import {
  normalizePoiApplicationTitle,
  normalizePoiRejectReason,
  toPoiApplicationView,
} from "./poi-application";
import type { Poi } from "../../../entities/poi";

test("normalizePoiApplicationTitle trims the POI id/title", () => {
  assert.equal(normalizePoiApplicationTitle("  羽毛球馆 A  "), "羽毛球馆 A");
});

test("normalizePoiRejectReason keeps empty reasons nullable", () => {
  assert.equal(normalizePoiRejectReason("  "), null);
  assert.equal(normalizePoiRejectReason(null), null);
  assert.equal(normalizePoiRejectReason("图片不清晰"), "图片不清晰");
});

test("toPoiApplicationView exposes first gallery image as application image", () => {
  const createdAt = new Date("2026-05-04T12:00:00.000Z");
  const reviewedAt = new Date("2026-05-04T12:30:00.000Z");
  const view = toPoiApplicationView({
    id: "新地点",
    status: "REJECTED",
    gallery: ["https://example.com/poi.png"],
    perTimeWindowCap: null,
    availabilityRules: [],
    meetingPoint: null,
    submittedByUserId: "00000000-0000-4000-8000-000000000001",
    reviewedByUserId: "00000000-0000-4000-8000-000000000002",
    reviewedAt,
    rejectReason: "图片不清晰",
    createdAt,
    updatedAt: reviewedAt,
  } satisfies Poi);

  assert.deepEqual(view, {
    id: "新地点",
    title: "新地点",
    status: "REJECTED",
    gallery: ["https://example.com/poi.png"],
    imageUrl: "https://example.com/poi.png",
    submittedByUserId: "00000000-0000-4000-8000-000000000001",
    reviewedByUserId: "00000000-0000-4000-8000-000000000002",
    reviewedAt: "2026-05-04T12:30:00.000Z",
    rejectReason: "图片不清晰",
    createdAt: "2026-05-04T12:00:00.000Z",
    updatedAt: "2026-05-04T12:30:00.000Z",
  });
});
