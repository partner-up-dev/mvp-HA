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
import { givenOpenPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";
import { probeMessageThreadVisibility } from "./_kit/probes/messages";

scenario("open_pr_join_reaches_ready", async (ctx) => {
  // Comprehension coverage:
  // With minPartners=2 and no maxPartners, the creator's initial active slot
  // keeps the PR OPEN; the second active participant reaches READY while
  // keeping the PR joinable for future participants.
  const creator = await givenUser("creator");
  const joiner = await givenUser("joiner");
  const outsider = await givenUser("outsider");
  const pr = await givenOpenPartnerRequest({
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
