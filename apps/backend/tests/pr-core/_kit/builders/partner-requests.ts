import {
  expectJsonResponse,
  requestJson,
} from "../../../_infra/http/backend-app";
import type {
  PartnerRequestFields,
  PRId,
} from "../../../../src/entities/partner-request";
import type { ScenarioUser } from "./users";

export type ScenarioPartnerRequest = {
  id: PRId;
};

type CreatePRResponse = {
  id: PRId;
  status: "DRAFT" | "OPEN";
  canonicalPath: string;
};

export type GivenOpenPartnerRequestInput = {
  creator: ScenarioUser;
  maxPartners?: number | null;
  minPartners: number;
  title?: string;
};

const defaultTimeWindow = (): [string, string] => [
  "2030-01-01T10:00:00.000Z",
  "2030-01-01T12:00:00.000Z",
];

export async function givenOpenPartnerRequest(
  input: GivenOpenPartnerRequestInput,
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
  if (body.status !== "OPEN") {
    throw new Error(`Expected created PR to be OPEN, got ${body.status}`);
  }

  return { id: body.id };
}
