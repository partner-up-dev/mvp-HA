import assert from "node:assert/strict";
import test from "node:test";
import {
  canNotifyForUnreadWave,
  hasUnreadPRMessages,
} from "./pr-message-thread.service";

test("canNotifyForUnreadWave allows first notification when inbox state is missing", () => {
  assert.equal(canNotifyForUnreadWave(null), true);
});

test("canNotifyForUnreadWave blocks duplicate notifications inside one unread wave", () => {
  assert.equal(
    canNotifyForUnreadWave({
      lastReadMessageId: 5,
      lastNotifiedMessageId: 6,
    }),
    false,
  );
});

test("canNotifyForUnreadWave re-enables notifications after read marker catches up", () => {
  assert.equal(
    canNotifyForUnreadWave({
      lastReadMessageId: 6,
      lastNotifiedMessageId: 6,
    }),
    true,
  );
});

test("hasUnreadPRMessages compares latest visible marker against read marker", () => {
  assert.equal(
    hasUnreadPRMessages({
      latestVisibleMessageId: 9,
      lastReadMessageId: 8,
    }),
    true,
  );
  assert.equal(
    hasUnreadPRMessages({
      latestVisibleMessageId: 9,
      lastReadMessageId: 9,
    }),
    false,
  );
});
