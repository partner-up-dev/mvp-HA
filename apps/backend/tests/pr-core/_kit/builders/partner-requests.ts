import {
  expectJsonResponse,
  requestJson,
} from "../../../_infra/http/backend-app";
import type {
  PartnerRequestFields,
  PRId,
  PRStatus,
} from "../../../../src/entities/partner-request";
import type { ScenarioUser } from "./users";

export type ScenarioPartnerRequest = {
  id: PRId;
};

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};

export type GivenPublishedPartnerRequestInput = {
  creator: ScenarioUser;
  maxPartners?: number | null;
  minPartners: number;
  expectedCreatedStatus?: PRStatus;
  title?: string;
};

const defaultTimeWindow = (): [string, string] => [
  "2030-01-01T10:00:00.000Z",
  "2030-01-01T12:00:00.000Z",
];

export async function givenPublishedPartnerRequest(
  input: GivenPublishedPartnerRequestInput,
): Promise<ScenarioPartnerRequest> {
  const fields: PartnerRequestFields = {
    title: input.title ?? "Scenario badminton partner request",
    type: "badminton",
    time: defaultTimeWindow(),
    location: "Scenario Court",
    minPartners: input.minPartners,
    maxPartners: input.maxPartners ?? null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
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
  const expectedStatus = input.expectedCreatedStatus ?? "OPEN";
  if (body.status !== expectedStatus) {
    throw new Error(
      `Expected created PR to be ${expectedStatus}, got ${body.status}`,
    );
  }

  return { id: body.id };
}
