import assert from "node:assert/strict";
import { describe, it } from "vitest";
import {
  hasAnchorParticipationPolicy,
  hasEnabledConfirmationPolicy,
  resolveAnchorParticipationPolicy,
} from "./anchor-participation-policy.service";

const request = {
  confirmationEnabled: false,
  confirmationStartOffsetMinutes: 120,
  confirmationEndOffsetMinutes: 30,
  joinLockOffsetMinutes: 30,
};

describe("anchor participation policy", () => {
  it("keeps join lock policy while confirmation is disabled", () => {
    const policy = resolveAnchorParticipationPolicy(request, [
      "2026-05-15T12:00:00.000Z",
      "2026-05-15T14:00:00.000Z",
    ]);

    assert.equal(hasAnchorParticipationPolicy(request), true);
    assert.equal(hasEnabledConfirmationPolicy(request), false);
    assert.equal(policy.confirmationEnabled, false);
    assert.equal(policy.confirmationStartAt, null);
    assert.equal(policy.confirmationEndAt, null);
    assert.equal(policy.joinLockAt?.toISOString(), "2026-05-15T11:30:00.000Z");
  });
});
