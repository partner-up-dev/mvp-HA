import assert from "node:assert/strict";
import {
  DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
  DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
  DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
} from "../../../../src/domains/pr/services";
import type { AnchorEventId } from "../../../../src/entities";
import type {
  PartnerRequestFields,
  PRId,
  PRStatus,
} from "../../../../src/entities/partner-request";
import {
  getAnchorEventLandingConfigKey,
  serializeAnchorEventLandingConfig,
  type AnchorEventLandingVariantRatioOverride,
} from "../../../../src/domains/anchor-event/landing-config";
import { AnchorEventRepository } from "../../../../src/repositories/AnchorEventRepository";
import { ConfigRepository } from "../../../../src/repositories/ConfigRepository";
import {
  expectJsonResponse,
  requestJson,
} from "../../../_infra/http/backend-app";
import type { ScenarioUser } from "../../../pr-core/_kit/builders/users";

export type ScenarioAnchorEvent = {
  id: AnchorEventId;
  title: string;
  type: string;
  locationId: string;
  timeWindow: [string, string];
};

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};

const anchorEventRepo = new AnchorEventRepository();
const configRepo = new ConfigRepository();

let scenarioAnchorEventSequence = 0;

const buildScenarioTimeWindow = (sequence: number): [string, string] => {
  const day = String(10 + sequence).padStart(2, "0");
  return [
    `2035-01-${day}T10:00:00.000Z`,
    `2035-01-${day}T11:00:00.000Z`,
  ];
};

export async function givenAnchorEvent(input: {
  label: string;
}): Promise<ScenarioAnchorEvent> {
  const sequence = scenarioAnchorEventSequence++;
  const timeWindow = buildScenarioTimeWindow(sequence);
  const type = `system-anchor-landing-${input.label}-${sequence}`;
  const title = `System Anchor Landing ${input.label}`;
  const locationId = `System Landing Court ${sequence}`;

  const event = await anchorEventRepo.create({
    title,
    type,
    description: `System scenario anchor event for ${input.label}`,
    locationPool: [locationId],
    timePoolConfig: {
      durationMinutes: 60,
      earliestLeadMinutes: null,
      startRules: [
        {
          id: "system-scenario-start",
          kind: "ABSOLUTE",
          startAt: timeWindow[0],
          description: "System scenario start window",
        },
      ],
    },
    defaultMinPartners: 2,
    defaultMaxPartners: null,
    defaultConfirmationStartOffsetMinutes:
      DEFAULT_CONFIRMATION_START_OFFSET_MINUTES,
    defaultConfirmationEndOffsetMinutes: DEFAULT_CONFIRMATION_END_OFFSET_MINUTES,
    defaultJoinLockOffsetMinutes: DEFAULT_JOIN_LOCK_OFFSET_MINUTES,
    meetingPoint: null,
    joinGateConfig: [],
    locationMeetingPoints: {},
    coverImage: null,
    betaGroupQrCode: null,
    status: "ACTIVE",
  });

  return {
    id: event.id,
    title: event.title,
    type: event.type,
    locationId,
    timeWindow,
  };
}

export async function givenAnchorEventVisiblePR(input: {
  creator: ScenarioUser;
  event: ScenarioAnchorEvent;
  title: string;
}): Promise<{ id: PRId }> {
  const fields: PartnerRequestFields = {
    title: input.title,
    type: input.event.type,
    time: input.event.timeWindow,
    location: input.event.locationId,
    minPartners: 2,
    maxPartners: null,
    partners: [],
    budget: null,
    preferences: ["场景:分流"],
    notes: "System scenario visible PR",
  };

  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: input.creator.token,
    body: {
      fields,
      createSource: "FORM",
    },
  });
  const body = await expectJsonResponse<CreatePRResponse>(response, 201);

  assert.equal(body.status, "OPEN");

  return { id: body.id };
}

export async function setAnchorEventLandingRollout(input: {
  eventId: AnchorEventId;
  ratios: AnchorEventLandingVariantRatioOverride;
  assignmentRevision: number;
}): Promise<void> {
  await configRepo.upsertValueByKey(
    getAnchorEventLandingConfigKey(input.eventId),
    serializeAnchorEventLandingConfig({
      variantRatioOverride: input.ratios,
      assignmentRevision: input.assignmentRevision,
    }),
  );
}
