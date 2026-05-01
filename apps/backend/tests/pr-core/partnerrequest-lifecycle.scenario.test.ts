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
import { partners, partnerRequests, prSupportResources } from "../../src/entities";
import { eq, sql } from "drizzle-orm";

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
