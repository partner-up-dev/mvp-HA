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
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "./_kit/builders/users";
import { probeMessageThreadVisibility } from "./_kit/probes/messages";
import { requestJson, expectJsonResponse } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import {
  partners,
  partnerRequests,
  prBookingContacts,
  prJoinNoticeAcceptances,
  prSupportResources,
} from "../../src/entities";
import { eq, sql } from "drizzle-orm";

type JoinGateProjectionResponse = {
  gates: Array<{
    key: string;
    kind: "JOIN_NOTICE" | "BOOKING_CONTACT" | "FALLBACK_CONFIRM";
    version: string;
    resolved: boolean;
  }>;
};

type ProblemDetailsResponse = {
  code?: string;
};

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

  const initialProjection = await expectJsonResponse<JoinGateProjectionResponse>(
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

  const resolvedProjection = await expectJsonResponse<JoinGateProjectionResponse>(
    await requestJson(`/api/pr/${pr.id}/join-gates/scenario-join-notice/resolve`, {
      method: "POST",
      token: joiner.token,
      body: {
        kind: "JOIN_NOTICE",
        version: "1",
        accepted: true,
      },
    }),
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

  const resolvedProjection = await expectJsonResponse<JoinGateProjectionResponse>(
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
});

scenario("admin_delete_pr_removes_root_partners_and_support_resources", async (ctx) => {
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
});
