import assert from "node:assert/strict";
import { scenario } from "../_infra/scenario/scenario";
import { exitPR } from "./_kit/actions/exit";
import { joinPartnerRequest } from "./_kit/actions/join";
import { cancelWaitlistPR, waitlistPR } from "./_kit/actions/waitlist";
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
  expectPartnerSlotStatus,
  expectPendingWaitlistCount,
  expectViewerWaitlisted,
} from "./_kit/assertions/waitlist";
import { givenPublishedPartnerRequest } from "./_kit/builders/partner-requests";
import { givenUser } from "./_kit/builders/users";
import { probeMessageThreadVisibility } from "./_kit/probes/messages";
import { getWaitlistDetail } from "./_kit/probes/waitlist";

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

    ctx.record("prId", pr.id);
    ctx.record("firstCandidateUserId", firstCandidate.user.id);
    ctx.record("secondCandidateUserId", secondCandidate.user.id);

    const joined = await joinPartnerRequest({ pr, user: joiner });
    assert.equal(joined.status, "FULL");
    await expectPartnerRequestStatus(pr, "FULL");
    await expectActiveParticipantCount(pr, 2);

    const firstWaitlist = await waitlistPR({ pr, user: firstCandidate });
    assert.equal(firstWaitlist.status, "FULL");

    const secondWaitlist = await waitlistPR({ pr, user: secondCandidate });
    assert.equal(secondWaitlist.isViewerWaitlisted, true);

    await expectViewerWaitlisted({ pr, user: firstCandidate, rank: 1 });
    await expectActiveParticipantCount(pr, 2);
    await expectPendingWaitlistCount(pr, 2);
    expectMessageThreadForbidden(
      await probeMessageThreadVisibility({ pr, viewer: firstCandidate }),
    );

    await exitPR({ pr, user: joiner });

    await expectPartnerRequestStatus(pr, "FULL");
    await expectActiveParticipantCount(pr, 2);
    await expectActiveParticipantsInclude(pr, [
      creator.user.id,
      firstCandidate.user.id,
    ]);
    await expectPartnerSlotStatus({
      pr,
      user: firstCandidate,
      status: "JOINED",
    });

    const secondDetail = await getWaitlistDetail({
      pr,
      user: secondCandidate,
    });
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

    await waitlistPR({ pr, user: firstCandidate });
    await waitlistPR({ pr, user: secondCandidate });
    await waitlistPR({ pr, user: thirdCandidate });

    await expectViewerWaitlisted({ pr, user: firstCandidate, rank: 1 });
    await expectViewerWaitlisted({ pr, user: secondCandidate, rank: 2 });
    await expectViewerWaitlisted({ pr, user: thirdCandidate, rank: 3 });
    await expectPendingWaitlistCount(pr, 3);

    const cancelResult = await cancelWaitlistPR({
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

    await exitPR({ pr, user: joiner });

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
