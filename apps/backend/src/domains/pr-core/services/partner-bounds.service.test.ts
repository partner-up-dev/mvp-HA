import assert from "node:assert/strict";
import test from "node:test";
import { HTTPException } from "hono/http-exception";
import {
  PARTNER_BOUNDS_ERROR_MESSAGES,
  assertManualPartnerBoundsValid,
  normalizeAutomaticPartnerBounds,
} from "./partner-bounds.service";

const assertThrowsHttpException = (
  fn: () => void,
  expectedMessage: string,
): void => {
  assert.throws(fn, (error: unknown) => {
    assert.ok(error instanceof HTTPException);
    assert.equal(error.status, 400);
    assert.equal(error.message, expectedMessage);
    return true;
  });
};

test("assertManualPartnerBoundsValid rejects null and sub-minimum minPartners", () => {
  assertThrowsHttpException(
    () => assertManualPartnerBoundsValid(null, null, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.minPartnersInvalid,
  );
  assertThrowsHttpException(
    () => assertManualPartnerBoundsValid(1, null, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.minPartnersInvalid,
  );
});

test("assertManualPartnerBoundsValid rejects maxPartners below minPartners", () => {
  assertThrowsHttpException(
    () => assertManualPartnerBoundsValid(2, 1, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.maxPartnersBelowMin,
  );
});

test("normalizeAutomaticPartnerBounds defaults invalid minPartners to 2", () => {
  assert.deepEqual(normalizeAutomaticPartnerBounds(null, null, 0), {
    minPartners: 2,
    maxPartners: null,
  });
  assert.deepEqual(normalizeAutomaticPartnerBounds(1, 4, 0), {
    minPartners: 2,
    maxPartners: 4,
  });
});

test("normalizeAutomaticPartnerBounds validates maxPartners against normalized minimum", () => {
  assertThrowsHttpException(
    () => normalizeAutomaticPartnerBounds(1, 1, 0),
    PARTNER_BOUNDS_ERROR_MESSAGES.maxPartnersBelowMin,
  );
});
