import test from "node:test";
import assert from "node:assert/strict";
import type { PublicPR } from "../read-models/public-pr-view.service";

const loadMetadataBuilder = async () => {
  process.env.DATABASE_URL ??= "postgres://user:password@localhost:5432/test";
  return (await import("./pr-share-metadata.service"))
    .buildPRCanonicalShareMetadata;
};

const buildPublicPR = (overrides: Partial<PublicPR> = {}): PublicPR => ({
  id: 182,
  type: "羽毛球",
  time: [null, null],
  location: "天河体育中心",
  status: "OPEN",
  visibilityStatus: "VISIBLE",
  confirmationStartOffsetMinutes: null,
  confirmationEndOffsetMinutes: null,
  joinLockOffsetMinutes: null,
  minPartners: null,
  maxPartners: null,
  budget: null,
  createdAt: new Date("2026-05-04T00:00:00.000Z"),
  preferences: [],
  notes: null,
  meetingPoint: null,
  joinGateConfig: [],
  createdBy: null,
  xiaohongshuPoster: null,
  wechatThumbnail: null,
  partners: [],
  myPartnerId: null,
  myPendingPartnerId: null,
  isViewerWaitlisted: false,
  isViewerReleased: false,
  ...overrides,
});

test("buildPRCanonicalShareMetadata uses explicit title first", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: "  周末羽毛球  ",
      location: "万胜围",
      type: "羽毛球",
    }),
  );

  assert.equal(metadata.title, "周末羽毛球");
});

test("buildPRCanonicalShareMetadata falls back to location before type", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: undefined,
      location: "  万胜围  ",
      type: "羽毛球",
    }),
  );

  assert.equal(metadata.title, "万胜围");
});

test("buildPRCanonicalShareMetadata falls back to type when location is empty", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: undefined,
      location: "   ",
      type: "羽毛球",
    }),
  );

  assert.equal(metadata.title, "羽毛球");
});

test("buildPRCanonicalShareMetadata uses generic PR title as final fallback", async () => {
  const buildPRCanonicalShareMetadata = await loadMetadataBuilder();
  const metadata = buildPRCanonicalShareMetadata(
    buildPublicPR({
      title: undefined,
      location: null,
      type: "   ",
    }),
  );

  assert.equal(metadata.title, "搭子请求");
});
