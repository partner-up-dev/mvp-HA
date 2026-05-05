import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import { joinPartnerRequest } from "./_kit/actions/join";
import {
  expectMessageThreadForbidden,
  expectMessageThreadVisible,
} from "./_kit/assertions/messages";
import {
  expectActiveParticipantCount,
  expectActiveParticipantsInclude,
} from "./_kit/assertions/participants";
import { expectPartnerRequestStatus } from "./_kit/assertions/partner-requests";
import {
  givenPublishedPartnerRequest,
  type ScenarioPartnerRequest,
} from "./_kit/builders/partner-requests";
import {
  givenAnonymousUser,
  givenAdminUser,
  givenUser,
  type ScenarioUser,
} from "./_kit/builders/users";
import { probeMessageThreadVisibility } from "./_kit/probes/messages";
import { requestJson, expectJsonResponse } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import {
  partners,
  partnerRequests,
  prBookingContacts,
  prJoinNoticeAcceptances,
  prSupportResources,
  type PartnerRequestFields,
  type PRId,
  type PRStatus,
} from "../../src/entities";
import type { PartnerStatus } from "../../src/entities/partner";
import { and, desc, eq, sql } from "drizzle-orm";

type AuthSessionResponse = {
  role: "anonymous" | "authenticated" | "service";
  userId: string | null;
  accessToken: string;
};

type CreateDraftPRResponse = {
  id: PRId;
  createdBy: string | null;
  status: PRStatus;
  canonicalPath: string;
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

type JoinGateProjectionResponse = {
  gates: Array<{
    key: string;
    kind: "JOIN_NOTICE" | "BOOKING_CONTACT";
    version: string;
    resolved: boolean;
  }>;
};

type ProblemDetailsResponse = {
  code?: string;
};

type WaitlistPRResponse = {
  status: string;
  isViewerWaitlisted: boolean;
  myPendingPartnerId: number | null;
};

type WaitlistDetailResponse = {
  partnerSection: {
    viewer: {
      isWaitlisted: boolean;
      waitlistRank: number | null;
      slotState: string;
      canWaitlist: boolean;
      pendingPartnerId: number | null;
    };
  };
};

let draftFieldsSequence = 0;

function buildScenarioFields(title: string): PartnerRequestFields {
  const sequence = draftFieldsSequence++;
  const day = String(10 + Math.floor(sequence / 8)).padStart(2, "0");
  const startHour = String(8 + (sequence % 8)).padStart(2, "0");
  const endHour = String(9 + (sequence % 8)).padStart(2, "0");

  return {
    title,
    type: "badminton",
    time: [
      `2031-01-${day}T${startHour}:00:00.000Z`,
      `2031-01-${day}T${endHour}:00:00.000Z`,
    ],
    location: `Scenario Court ${sequence}`,
    minPartners: 2,
    maxPartners: null,
    partners: [],
    budget: null,
    preferences: [],
    notes: null,
  };
}

async function createDraftPartnerRequest(input: {
  creator: ScenarioUser;
  title: string;
}): Promise<ScenarioPartnerRequest> {
  const response = await requestJson("/api/pr/new/form", {
    method: "POST",
    token: input.creator.token,
    body: {
      fields: buildScenarioFields(input.title),
      createSource: "FORM",
    },
  });
  const body = await expectJsonResponse<CreateDraftPRResponse>(response, 201);
  assert.equal(body.status, "DRAFT");
  assert.equal(body.createdBy, null);

  return { id: body.id };
}

async function waitlistPartnerRequest(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<WaitlistPRResponse> {
  const result = await expectJsonResponse<WaitlistPRResponse>(
    await requestJson(`/api/pr/${input.pr.id}/waitlist`, {
      method: "POST",
      token: input.user.token,
    }),
    200,
  );
  assert.equal(result.isViewerWaitlisted, true);
  assert.notEqual(result.myPendingPartnerId, null);
  return result;
}

async function cancelWaitlistPartnerRequest(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<WaitlistPRResponse> {
  const result = await expectJsonResponse<WaitlistPRResponse>(
    await requestJson(`/api/pr/${input.pr.id}/waitlist/cancel`, {
      method: "POST",
      token: input.user.token,
    }),
    200,
  );
  assert.equal(result.isViewerWaitlisted, false);
  assert.equal(result.myPendingPartnerId, null);
  return result;
}

async function getWaitlistDetail(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
}): Promise<WaitlistDetailResponse> {
  return expectJsonResponse<WaitlistDetailResponse>(
    await requestJson(`/api/pr/${input.pr.id}`, {
      method: "GET",
      token: input.user.token,
    }),
    200,
  );
}

async function expectViewerWaitlisted(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
  rank: number;
}): Promise<void> {
  const detail = await getWaitlistDetail(input);
  assert.equal(detail.partnerSection.viewer.isWaitlisted, true);
  assert.equal(detail.partnerSection.viewer.waitlistRank, input.rank);
  assert.equal(detail.partnerSection.viewer.slotState, "PENDING");
  assert.equal(detail.partnerSection.viewer.canWaitlist, false);
}

async function expectPartnerSlotStatus(input: {
  pr: ScenarioPartnerRequest;
  user: ScenarioUser;
  status: PartnerStatus;
}): Promise<void> {
  const db = getTestDb();
  const [slot] = await db
    .select({ status: partners.status })
    .from(partners)
    .where(
      and(
        eq(partners.prId, input.pr.id),
        eq(partners.userId, input.user.user.id),
      ),
    )
    .orderBy(desc(partners.id));
  assert.equal(slot?.status, input.status);
}

async function expectPendingWaitlistCount(
  pr: ScenarioPartnerRequest,
  expected: number,
): Promise<void> {
  const db = getTestDb();
  const pendingSlots = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(partners)
    .where(and(eq(partners.prId, pr.id), eq(partners.status, "PENDING")));
  assert.equal(pendingSlots[0]?.count ?? 0, expected);
}

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
  const pr = await createDraftPartnerRequest({
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
  const pr = await createDraftPartnerRequest({
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
  const pr = await createDraftPartnerRequest({
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

scenario("open_pr_join_reaches_ready", async (ctx) => {
  // Comprehension coverage:
  // With minPartners=2 and no maxPartners, the creator's initial active slot
  // keeps the PR OPEN; the second active participant reaches READY while
  // keeping the PR joinable for future participants.
  const creator = await givenUser("creator");
  const joiner = await givenUser("joiner");
  const outsider = await givenUser("outsider");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 2,
    maxPartners: null,
  });

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("joinerUserId", joiner.user.id);
  ctx.record("outsiderUserId", outsider.user.id);
  ctx.record("prId", pr.id);

  await expectPartnerRequestStatus(pr, "OPEN");
  await expectActiveParticipantCount(pr, 1);
  await expectActiveParticipantsInclude(pr, [creator.user.id]);

  const joined = await joinPartnerRequest({ pr, user: joiner });
  ctx.record("joinResponseStatus", joined.status);
  ctx.record("joinResponsePartners", joined.partners);

  assert.equal(
    joined.status,
    "READY",
    `Expected join response to expose READY, got ${joined.status}`,
  );
  await expectPartnerRequestStatus(pr, "READY");
  await expectActiveParticipantCount(pr, 2);
  await expectActiveParticipantsInclude(pr, [creator.user.id, joiner.user.id]);

  const duplicateJoin = await joinPartnerRequest({ pr, user: joiner });
  ctx.record("duplicateJoinResponsePartners", duplicateJoin.partners);
  await expectActiveParticipantCount(pr, 2);

  expectMessageThreadVisible(
    await probeMessageThreadVisibility({ pr, viewer: creator }),
  );
  expectMessageThreadVisible(
    await probeMessageThreadVisibility({ pr, viewer: joiner }),
  );
  expectMessageThreadForbidden(
    await probeMessageThreadVisibility({ pr, viewer: outsider }),
  );
});

scenario("min_one_pr_publishes_ready_with_creator_slot", async (ctx) => {
  const creator = await givenUser("min-one-creator");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 1,
    maxPartners: null,
    expectedCreatedStatus: "READY",
  });

  ctx.record("creatorUserId", creator.user.id);
  ctx.record("prId", pr.id);

  await expectPartnerRequestStatus(pr, "READY");
  await expectActiveParticipantCount(pr, 1);
  await expectActiveParticipantsInclude(pr, [creator.user.id]);
});

scenario("join_gate_projection_excludes_fallback_confirm", async (ctx) => {
  const creator = await givenUser("gate-projection-creator");
  const viewer = await givenUser("gate-projection-viewer");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 2,
    maxPartners: null,
  });

  ctx.record("prId", pr.id);
  ctx.record("viewerUserId", viewer.user.id);

  const projection = await expectJsonResponse<JoinGateProjectionResponse>(
    await requestJson(`/api/pr/${pr.id}/join-gates`, {
      method: "GET",
      token: viewer.token,
    }),
    200,
  );
  assert.deepEqual(projection.gates, []);
});

scenario(
  "full_pr_waitlist_promotes_earliest_pending_after_exit",
  async (ctx) => {
    const creator = await givenUser("waitlist-creator");
    const joiner = await givenUser("waitlist-joiner");
    const firstCandidate = await givenUser("waitlist-first");
    const secondCandidate = await givenUser("waitlist-second");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "READY",
    });
    const db = getTestDb();

    ctx.record("prId", pr.id);
    ctx.record("firstCandidateUserId", firstCandidate.user.id);
    ctx.record("secondCandidateUserId", secondCandidate.user.id);

    const joined = await joinPartnerRequest({ pr, user: joiner });
    assert.equal(joined.status, "FULL");
    await expectPartnerRequestStatus(pr, "FULL");
    await expectActiveParticipantCount(pr, 2);

    const firstWaitlist = await expectJsonResponse<WaitlistPRResponse>(
      await requestJson(`/api/pr/${pr.id}/waitlist`, {
        method: "POST",
        token: firstCandidate.token,
      }),
      200,
    );
    assert.equal(firstWaitlist.status, "FULL");
    assert.equal(firstWaitlist.isViewerWaitlisted, true);
    assert.notEqual(firstWaitlist.myPendingPartnerId, null);

    const secondWaitlist = await expectJsonResponse<WaitlistPRResponse>(
      await requestJson(`/api/pr/${pr.id}/waitlist`, {
        method: "POST",
        token: secondCandidate.token,
      }),
      200,
    );
    assert.equal(secondWaitlist.isViewerWaitlisted, true);

    const firstDetail = await expectJsonResponse<WaitlistDetailResponse>(
      await requestJson(`/api/pr/${pr.id}`, {
        method: "GET",
        token: firstCandidate.token,
      }),
      200,
    );
    assert.equal(firstDetail.partnerSection.viewer.isWaitlisted, true);
    assert.equal(firstDetail.partnerSection.viewer.waitlistRank, 1);
    assert.equal(firstDetail.partnerSection.viewer.slotState, "PENDING");
    assert.equal(firstDetail.partnerSection.viewer.canWaitlist, false);

    await expectActiveParticipantCount(pr, 2);
    const pendingBeforeRelease = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(partners)
      .where(and(eq(partners.prId, pr.id), eq(partners.status, "PENDING")));
    assert.equal(pendingBeforeRelease[0]?.count ?? 0, 2);
    expectMessageThreadForbidden(
      await probeMessageThreadVisibility({ pr, viewer: firstCandidate }),
    );

    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/exit`, {
        method: "POST",
        token: joiner.token,
      }),
      200,
    );

    await expectPartnerRequestStatus(pr, "FULL");
    await expectActiveParticipantCount(pr, 2);
    await expectActiveParticipantsInclude(pr, [
      creator.user.id,
      firstCandidate.user.id,
    ]);

    const [firstSlot] = await db
      .select({ status: partners.status })
      .from(partners)
      .where(
        and(
          eq(partners.prId, pr.id),
          eq(partners.userId, firstCandidate.user.id),
        ),
      );
    assert.equal(firstSlot?.status, "JOINED");

    const secondDetail = await expectJsonResponse<WaitlistDetailResponse>(
      await requestJson(`/api/pr/${pr.id}`, {
        method: "GET",
        token: secondCandidate.token,
      }),
      200,
    );
    assert.equal(secondDetail.partnerSection.viewer.isWaitlisted, true);
    assert.equal(secondDetail.partnerSection.viewer.waitlistRank, 1);
    assert.equal(secondDetail.partnerSection.viewer.slotState, "PENDING");

    expectMessageThreadVisible(
      await probeMessageThreadVisibility({ pr, viewer: firstCandidate }),
    );
    expectMessageThreadForbidden(
      await probeMessageThreadVisibility({ pr, viewer: secondCandidate }),
    );
  },
);

scenario(
  "waitlist_cancel_removes_pending_slot_from_fifo_promotion",
  async (ctx) => {
    const creator = await givenUser("waitlist-cancel-creator");
    const joiner = await givenUser("waitlist-cancel-joiner");
    const firstCandidate = await givenUser("waitlist-cancel-first");
    const secondCandidate = await givenUser("waitlist-cancel-second");
    const thirdCandidate = await givenUser("waitlist-cancel-third");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "READY",
    });

    ctx.record("prId", pr.id);
    ctx.record("firstCandidateUserId", firstCandidate.user.id);
    ctx.record("secondCandidateUserId", secondCandidate.user.id);
    ctx.record("thirdCandidateUserId", thirdCandidate.user.id);

    const joined = await joinPartnerRequest({ pr, user: joiner });
    assert.equal(joined.status, "FULL");
    await expectPartnerRequestStatus(pr, "FULL");
    await expectActiveParticipantCount(pr, 2);

    await waitlistPartnerRequest({ pr, user: firstCandidate });
    await waitlistPartnerRequest({ pr, user: secondCandidate });
    await waitlistPartnerRequest({ pr, user: thirdCandidate });

    await expectViewerWaitlisted({ pr, user: firstCandidate, rank: 1 });
    await expectViewerWaitlisted({ pr, user: secondCandidate, rank: 2 });
    await expectViewerWaitlisted({ pr, user: thirdCandidate, rank: 3 });
    await expectPendingWaitlistCount(pr, 3);

    const cancelResult = await cancelWaitlistPartnerRequest({
      pr,
      user: firstCandidate,
    });
    assert.equal(cancelResult.status, "FULL");

    const firstAfterCancel = await getWaitlistDetail({
      pr,
      user: firstCandidate,
    });
    assert.equal(firstAfterCancel.partnerSection.viewer.isWaitlisted, false);
    assert.equal(firstAfterCancel.partnerSection.viewer.waitlistRank, null);
    assert.equal(
      firstAfterCancel.partnerSection.viewer.slotState,
      "NOT_JOINED",
    );
    assert.equal(firstAfterCancel.partnerSection.viewer.pendingPartnerId, null);
    assert.equal(firstAfterCancel.partnerSection.viewer.canWaitlist, true);
    await expectPartnerSlotStatus({
      pr,
      user: firstCandidate,
      status: "CANCELLED",
    });
    await expectViewerWaitlisted({ pr, user: secondCandidate, rank: 1 });
    await expectViewerWaitlisted({ pr, user: thirdCandidate, rank: 2 });
    await expectPendingWaitlistCount(pr, 2);
    expectMessageThreadForbidden(
      await probeMessageThreadVisibility({ pr, viewer: firstCandidate }),
    );

    await expectJsonResponse(
      await requestJson(`/api/pr/${pr.id}/exit`, {
        method: "POST",
        token: joiner.token,
      }),
      200,
    );

    await expectPartnerRequestStatus(pr, "FULL");
    await expectActiveParticipantCount(pr, 2);
    await expectActiveParticipantsInclude(pr, [
      creator.user.id,
      secondCandidate.user.id,
    ]);
    await expectPartnerSlotStatus({
      pr,
      user: firstCandidate,
      status: "CANCELLED",
    });
    await expectPartnerSlotStatus({
      pr,
      user: secondCandidate,
      status: "JOINED",
    });
    await expectPartnerSlotStatus({
      pr,
      user: thirdCandidate,
      status: "PENDING",
    });
    await expectViewerWaitlisted({ pr, user: thirdCandidate, rank: 1 });
    expectMessageThreadVisible(
      await probeMessageThreadVisibility({ pr, viewer: secondCandidate }),
    );
    expectMessageThreadForbidden(
      await probeMessageThreadVisibility({ pr, viewer: firstCandidate }),
    );
    expectMessageThreadForbidden(
      await probeMessageThreadVisibility({ pr, viewer: thirdCandidate }),
    );
  },
);

scenario("join_notice_gate_blocks_join_until_viewer_accepts", async (ctx) => {
  const creator = await givenUser("notice-creator");
  const joiner = await givenUser("notice-joiner");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 2,
    maxPartners: null,
  });
  const db = getTestDb();

  await db
    .update(partnerRequests)
    .set({
      joinGateConfig: [
        {
          kind: "JOIN_NOTICE",
          key: "scenario-join-notice",
          version: "1",
          title: "Scenario join notice",
          source: "PR",
          body: "Read and accept before joining.",
        },
      ],
    })
    .where(eq(partnerRequests.id, pr.id));

  ctx.record("prId", pr.id);
  ctx.record("joinerUserId", joiner.user.id);

  const initialProjection =
    await expectJsonResponse<JoinGateProjectionResponse>(
      await requestJson(`/api/pr/${pr.id}/join-gates`, {
        method: "GET",
        token: joiner.token,
      }),
      200,
    );
  assert.equal(initialProjection.gates[0]?.kind, "JOIN_NOTICE");
  assert.equal(initialProjection.gates[0]?.resolved, false);

  const rejectedJoin = await expectJsonResponse<ProblemDetailsResponse>(
    await requestJson(`/api/pr/${pr.id}/join`, {
      method: "POST",
      token: joiner.token,
      body: {},
    }),
    400,
  );
  assert.equal(rejectedJoin.code, "PR_JOIN_GATE_UNRESOLVED");

  const resolvedProjection =
    await expectJsonResponse<JoinGateProjectionResponse>(
      await requestJson(
        `/api/pr/${pr.id}/join-gates/scenario-join-notice/resolve`,
        {
          method: "POST",
          token: joiner.token,
          body: {
            kind: "JOIN_NOTICE",
            version: "1",
            accepted: true,
          },
        },
      ),
      200,
    );
  assert.equal(resolvedProjection.gates[0]?.resolved, true);

  const acceptances = await db
    .select()
    .from(prJoinNoticeAcceptances)
    .where(eq(prJoinNoticeAcceptances.prId, pr.id));
  assert.equal(acceptances.length, 1);
  assert.equal(acceptances[0]?.userId, joiner.user.id);
  assert.equal(acceptances[0]?.gateKey, "scenario-join-notice");

  const joined = await joinPartnerRequest({ pr, user: joiner });
  assert.equal(joined.status, "READY");
  await expectActiveParticipantCount(pr, 2);

  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/exit`, {
      method: "POST",
      token: joiner.token,
    }),
    200,
  );

  const resetAcceptances = await db
    .select()
    .from(prJoinNoticeAcceptances)
    .where(
      and(
        eq(prJoinNoticeAcceptances.prId, pr.id),
        eq(prJoinNoticeAcceptances.userId, joiner.user.id),
      ),
    );
  assert.equal(resetAcceptances.length, 0);

  const afterExitProjection =
    await expectJsonResponse<JoinGateProjectionResponse>(
      await requestJson(`/api/pr/${pr.id}/join-gates`, {
        method: "GET",
        token: joiner.token,
      }),
      200,
    );
  assert.equal(afterExitProjection.gates[0]?.kind, "JOIN_NOTICE");
  assert.equal(afterExitProjection.gates[0]?.resolved, false);

  const rejectedRejoin = await expectJsonResponse<ProblemDetailsResponse>(
    await requestJson(`/api/pr/${pr.id}/join`, {
      method: "POST",
      token: joiner.token,
      body: {},
    }),
    400,
  );
  assert.equal(rejectedRejoin.code, "PR_JOIN_GATE_UNRESOLVED");
});

scenario("booking_contact_gate_collects_phone_before_join", async (ctx) => {
  const creator = await givenUser("booking-contact-creator");
  const joiner = await givenUser("booking-contact-joiner");
  const pr = await givenPublishedPartnerRequest({
    creator,
    minPartners: 2,
    maxPartners: null,
  });
  const db = getTestDb();

  await db
    .update(partnerRequests)
    .set({
      joinGateConfig: [
        {
          kind: "BOOKING_CONTACT",
          key: "scenario-booking-contact",
          version: "1",
          title: "Booking contact",
          source: "PR",
          prompt: "Phone used for booking communication.",
        },
      ],
    })
    .where(eq(partnerRequests.id, pr.id));

  ctx.record("prId", pr.id);
  ctx.record("joinerUserId", joiner.user.id);

  const rejectedJoin = await expectJsonResponse<ProblemDetailsResponse>(
    await requestJson(`/api/pr/${pr.id}/join`, {
      method: "POST",
      token: joiner.token,
      body: {},
    }),
    400,
  );
  assert.equal(rejectedJoin.code, "PR_JOIN_GATE_UNRESOLVED");

  const resolvedProjection =
    await expectJsonResponse<JoinGateProjectionResponse>(
      await requestJson(
        `/api/pr/${pr.id}/join-gates/scenario-booking-contact/resolve`,
        {
          method: "POST",
          token: joiner.token,
          body: {
            kind: "BOOKING_CONTACT",
            version: "1",
            phone: "13800138000",
          },
        },
      ),
      200,
    );
  assert.equal(resolvedProjection.gates[0]?.resolved, true);

  const pendingContacts = await db
    .select()
    .from(prBookingContacts)
    .where(eq(prBookingContacts.prId, pr.id));
  assert.equal(pendingContacts.length, 1);
  assert.equal(pendingContacts[0]?.ownerUserId, joiner.user.id);
  assert.equal(pendingContacts[0]?.ownerPartnerId, null);

  const joined = await joinPartnerRequest({ pr, user: joiner });
  assert.equal(joined.status, "READY");

  const resolvedContacts = await db
    .select()
    .from(prBookingContacts)
    .where(eq(prBookingContacts.prId, pr.id));
  assert.equal(resolvedContacts.length, 1);
  assert.equal(resolvedContacts[0]?.ownerUserId, joiner.user.id);
  assert.notEqual(resolvedContacts[0]?.ownerPartnerId, null);

  await expectJsonResponse(
    await requestJson(`/api/pr/${pr.id}/exit`, {
      method: "POST",
      token: joiner.token,
    }),
    200,
  );

  const resetContacts = await db
    .select()
    .from(prBookingContacts)
    .where(eq(prBookingContacts.prId, pr.id));
  assert.equal(resetContacts.length, 0);

  const afterExitProjection =
    await expectJsonResponse<JoinGateProjectionResponse>(
      await requestJson(`/api/pr/${pr.id}/join-gates`, {
        method: "GET",
        token: joiner.token,
      }),
      200,
    );
  assert.equal(afterExitProjection.gates[0]?.kind, "BOOKING_CONTACT");
  assert.equal(afterExitProjection.gates[0]?.resolved, false);

  const rejectedRejoin = await expectJsonResponse<ProblemDetailsResponse>(
    await requestJson(`/api/pr/${pr.id}/join`, {
      method: "POST",
      token: joiner.token,
      body: {},
    }),
    400,
  );
  assert.equal(rejectedRejoin.code, "PR_JOIN_GATE_UNRESOLVED");
});

scenario(
  "admin_delete_pr_removes_root_partners_and_support_resources",
  async (ctx) => {
    const creator = await givenUser("delete-creator");
    const admin = await givenAdminUser("delete-operator");
    const pr = await givenPublishedPartnerRequest({
      creator,
      minPartners: 1,
      maxPartners: 2,
      expectedCreatedStatus: "READY",
      title: "Scenario delete target",
    });

    const db = getTestDb();
    await db.insert(prSupportResources).values({
      prId: pr.id,
      title: "Scenario booking resource",
      resourceKind: "VENUE",
      bookingRequired: true,
      bookingHandledBy: "PLATFORM",
      bookingLocksParticipant: false,
      settlementMode: "NONE",
      summaryText: "Scenario support resource",
      detailRules: [],
      displayOrder: 0,
    });

    ctx.record("prId", pr.id);

    const response = await requestJson(`/api/admin/prs/${pr.id}`, {
      method: "DELETE",
      token: admin.token,
    });
    const body = await expectJsonResponse<{
      ok: true;
      prId: number;
      deletedPartnerCount: number;
      deletedSupportResourceCount: number;
    }>(response, 200);

    assert.equal(body.ok, true);
    assert.equal(body.prId, pr.id);
    assert.equal(body.deletedPartnerCount, 1);
    assert.equal(body.deletedSupportResourceCount, 1);

    const [rootRows, partnerCountRows, supportResourceCountRows] =
      await Promise.all([
        db
          .select({ id: partnerRequests.id })
          .from(partnerRequests)
          .where(eq(partnerRequests.id, pr.id)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(partners)
          .where(eq(partners.prId, pr.id)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(prSupportResources)
          .where(eq(prSupportResources.prId, pr.id)),
      ]);

    assert.equal(rootRows.length, 0);
    assert.equal(partnerCountRows[0]?.count ?? 0, 0);
    assert.equal(supportResourceCountRows[0]?.count ?? 0, 0);
  },
);
