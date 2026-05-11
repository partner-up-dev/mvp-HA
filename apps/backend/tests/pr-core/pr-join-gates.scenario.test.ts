import assert from "node:assert/strict";
import { and, eq } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { exitPR } from "./_kit/actions/exit";
import {
  getJoinGateProjection,
  resolveBookingContactGate,
  resolveJoinNoticeGate,
} from "./_kit/actions/join-gates";
import { joinPartnerRequest } from "./_kit/actions/join";
import { expectActiveParticipantCount } from "./_kit/assertions/participants";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { getTestDb } from "../_infra/probes/sql-probe";
import {
  partnerRequests,
  prBookingContacts,
  prJoinNoticeAcceptances,
} from "../../src/entities";

type ProblemDetailsResponse = {
  code?: string;
};

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

  const projection = await getJoinGateProjection({ pr, user: viewer });
  assert.deepEqual(projection.gates, []);
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

  const initialProjection = await getJoinGateProjection({ pr, user: joiner });
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

  const resolvedProjection = await resolveJoinNoticeGate({
    pr,
    user: joiner,
    gateKey: "scenario-join-notice",
    version: "1",
    accepted: true,
  });
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

  await exitPR({ pr, user: joiner });

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

  const afterExitProjection = await getJoinGateProjection({ pr, user: joiner });
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

  const resolvedProjection = await resolveBookingContactGate({
    pr,
    user: joiner,
    gateKey: "scenario-booking-contact",
    version: "1",
    phone: "13800138000",
  });
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

  await exitPR({ pr, user: joiner });

  const resetContacts = await db
    .select()
    .from(prBookingContacts)
    .where(eq(prBookingContacts.prId, pr.id));
  assert.equal(resetContacts.length, 0);

  const afterExitProjection = await getJoinGateProjection({ pr, user: joiner });
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
