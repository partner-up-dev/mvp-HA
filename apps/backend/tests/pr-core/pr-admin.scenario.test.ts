import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";
import { scenario } from "../_infra/scenario/scenario";
import { expectJsonResponse, requestJson } from "../_infra/http/backend-app";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenAdminUser, givenUser } from "./_kit/builders/users";
import { getTestDb } from "../_infra/probes/sql-probe";
import { partnerRequests, partners, prSupportResources } from "../../src/entities";

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
