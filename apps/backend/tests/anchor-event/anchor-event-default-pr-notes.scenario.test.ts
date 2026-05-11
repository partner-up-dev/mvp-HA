import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import { partnerRequests } from "../../src/entities";
import type {
  PartnerRequestFields,
  PRId,
  PRStatus,
} from "../../src/entities/partner-request";
import { givenUser } from "../pr-core/_kit/builders/users";
import { givenAnchorEvent } from "./_kit/builders/anchor-events";

type CreatePRResponse = {
  id: PRId;
  status: PRStatus;
  canonicalPath: string;
};

const createStructuredPR = async (
  token: string,
  fields: PartnerRequestFields,
): Promise<CreatePRResponse> => {
  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token,
    body: {
      fields,
      createSource: "FORM",
    },
  });
  return await expectJsonResponse<CreatePRResponse>(response, 201);
};

const probePRNotes = async (prId: PRId): Promise<string | null> => {
  const rows = await getTestDb()
    .select({ notes: partnerRequests.notes })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, prId));
  return rows[0]?.notes ?? null;
};

scenario(
  "anchor_event_default_pr_notes_materialize_only_when_create_notes_are_empty",
  async (ctx) => {
    const creator = await givenUser("default-pr-notes-creator");
    const explicitCreator = await givenUser("explicit-pr-notes-creator");
    const event = await givenAnchorEvent({
      label: "default-pr-notes",
      defaultPrNotes: "Arrive 10 minutes early and follow on-site warmup order.",
    });
    const baseFields: PartnerRequestFields = {
      title: "Scenario default notes PR",
      type: event.type,
      time: event.timeWindow,
      location: event.locationId,
      minPartners: 2,
      maxPartners: null,
      partners: [],
      budget: null,
      preferences: [],
      notes: null,
    };

    const defaulted = await createStructuredPR(creator.token, baseFields);
    const explicit = await createStructuredPR(explicitCreator.token, {
      ...baseFields,
      title: "Scenario explicit notes PR",
      notes: "I will bring a spare racket and want doubles rotation practice.",
    });
    ctx.record("eventId", event.id);
    ctx.record("defaultedPrId", defaulted.id);
    ctx.record("explicitPrId", explicit.id);

    assert.equal(defaulted.status, "OPEN");
    assert.equal(explicit.status, "OPEN");
    assert.equal(
      await probePRNotes(defaulted.id),
      "Arrive 10 minutes early and follow on-site warmup order.",
    );
    assert.equal(
      await probePRNotes(explicit.id),
      "I will bring a spare racket and want doubles rotation practice.",
    );
  },
);
