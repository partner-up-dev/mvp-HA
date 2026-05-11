import assert from "node:assert/strict";
import { eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { expectActiveParticipantsInclude } from "./_kit/assertions/participants";
import {
  buildScenarioFields,
  givenDraftPR,
} from "./_kit/builders/partner-requests";
import { givenAnonymousUser, givenUser } from "./_kit/builders/users";
import { getTestDb } from "../_infra/probes/sql-probe";
import { partnerRequests, type PRId, type PRStatus } from "../../src/entities";

type AuthSessionResponse = {
  role: "anonymous" | "authenticated" | "service";
  userId: string | null;
  accessToken: string;
};

type PublishDraftPRResponse = {
  id: PRId;
  pr: {
    status: PRStatus;
    createdBy: string | null;
    partners: number[];
  };
  auth: AuthSessionResponse;
};

type DraftContentUpdateResponse = {
  id: PRId;
  status: PRStatus;
  title?: string;
  createdBy: string | null;
};

type ProblemDetailsResponse = {
  code?: string;
};

scenario("anonymous_uuid_restores_session", async (ctx) => {
  const anonymous = await givenAnonymousUser("session-restore");
  ctx.record("anonymousUserId", anonymous.user.id);

  const session = await expectJsonResponse<AuthSessionResponse>(
    await requestJson("/api/auth/session", {
      method: "POST",
      body: {
        userId: anonymous.user.id,
      },
    }),
    200,
  );

  assert.equal(session.role, "anonymous");
  assert.equal(session.userId, anonymous.user.id);
  assert.ok(session.accessToken.length > 0);
});

scenario("anonymous_publish_draft_requires_authenticated_user", async (ctx) => {
  const anonymous = await givenAnonymousUser("draft-publisher");
  const pr = await givenDraftPR({
    creator: anonymous,
    title: "Scenario draft publish auth required",
  });
  ctx.record("anonymousUserId", anonymous.user.id);
  ctx.record("prId", pr.id);

  const response = await requestJson(`/api/pr/${pr.id}/publish`, {
    method: "POST",
    token: anonymous.token,
  });
  assert.match(
    response.headers.get("content-type") ?? "",
    /^application\/problem\+json/,
  );
  const body = await expectJsonResponse<ProblemDetailsResponse>(response, 403);
  assert.equal(body.code, "AUTHENTICATED_REQUIRED");
});

scenario("authenticated_user_publish_claims_creatorless_draft", async (ctx) => {
  const anonymous = await givenAnonymousUser("draft-author");
  const publisher = await givenUser("draft-publisher");
  const pr = await givenDraftPR({
    creator: anonymous,
    title: "Scenario authenticated draft publish",
  });
  ctx.record("anonymousUserId", anonymous.user.id);
  ctx.record("publisherUserId", publisher.user.id);
  ctx.record("prId", pr.id);

  const result = await expectJsonResponse<PublishDraftPRResponse>(
    await requestJson(`/api/pr/${pr.id}/publish`, {
      method: "POST",
      token: publisher.token,
    }),
    200,
  );

  assert.equal(result.id, pr.id);
  assert.equal(result.pr.createdBy, publisher.user.id);
  assert.equal(result.pr.status, "OPEN");
  assert.equal(result.auth.role, "authenticated");
  assert.equal(result.auth.userId, publisher.user.id);
  await expectActiveParticipantsInclude(pr, [publisher.user.id]);

  const db = getTestDb();
  const [stored] = await db
    .select({
      createdBy: partnerRequests.createdBy,
      status: partnerRequests.status,
    })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, pr.id));
  assert.equal(stored?.createdBy, publisher.user.id);
  assert.equal(stored?.status, "OPEN");
});

scenario("anonymous_user_can_edit_creatorless_draft_content", async (ctx) => {
  const draftAuthor = await givenAnonymousUser("draft-content-author");
  const editor = await givenAnonymousUser("draft-content-editor");
  const pr = await givenDraftPR({
    creator: draftAuthor,
    title: "Scenario draft content initial",
  });
  const updatedFields = buildScenarioFields("Scenario draft content updated");
  ctx.record("draftAuthorUserId", draftAuthor.user.id);
  ctx.record("editorUserId", editor.user.id);
  ctx.record("prId", pr.id);

  const result = await expectJsonResponse<DraftContentUpdateResponse>(
    await requestJson(`/api/pr/${pr.id}/content`, {
      method: "PATCH",
      token: editor.token,
      body: {
        fields: updatedFields,
      },
    }),
    200,
  );

  assert.equal(result.status, "DRAFT");
  assert.equal(result.title, updatedFields.title);
  assert.equal(result.createdBy, null);

  const db = getTestDb();
  const [stored] = await db
    .select({
      title: partnerRequests.title,
      createdBy: partnerRequests.createdBy,
    })
    .from(partnerRequests)
    .where(eq(partnerRequests.id, pr.id));
  assert.equal(stored?.title, updatedFields.title);
  assert.equal(stored?.createdBy, null);
});
