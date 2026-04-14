import type { PRMessageInboxState } from "../../../entities/pr-message-inbox-state";
import type { PRMessageId } from "../../../entities/pr-message";
import type { UserId } from "../../../entities/user";
import type { PRMessageWithAuthor } from "../../../repositories/PRMessageRepository";

export const PR_MESSAGE_RATE_LIMIT_MAX_MESSAGES = 3;
export const PR_MESSAGE_RATE_LIMIT_WINDOW_MS = 60_000;

export type PRMessageThreadItem = {
  id: PRMessageId;
  body: string;
  createdAt: string;
  author: {
    userId: UserId;
    nickname: string | null;
    avatarUrl: string | null;
  };
};

export type PRMessageThreadState = {
  canPost: boolean;
  latestVisibleMessageId: PRMessageId | null;
  lastReadMessageId: PRMessageId | null;
  hasUnread: boolean;
};

export type PRMessageThreadResponse = {
  items: PRMessageThreadItem[];
  thread: PRMessageThreadState;
};

export type CreatePRMessageResponse = {
  message: PRMessageThreadItem;
  thread: PRMessageThreadState;
};

const coalesceMessageId = (value: PRMessageId | null | undefined): number =>
  value ?? 0;

export const hasUnreadPRMessages = (input: {
  latestVisibleMessageId: PRMessageId | null;
  lastReadMessageId: PRMessageId | null;
}): boolean =>
  coalesceMessageId(input.latestVisibleMessageId) >
  coalesceMessageId(input.lastReadMessageId);

export const hasUnreadWaveNotification = (
  inboxState: Pick<
    PRMessageInboxState,
    "lastReadMessageId" | "lastNotifiedMessageId"
  > | null,
): boolean => {
  const lastNotifiedMessageId = inboxState?.lastNotifiedMessageId ?? null;
  if (lastNotifiedMessageId === null) {
    return false;
  }

  return (
    coalesceMessageId(lastNotifiedMessageId) >
    coalesceMessageId(inboxState?.lastReadMessageId ?? null)
  );
};

export const canNotifyForUnreadWave = (
  inboxState: Pick<
    PRMessageInboxState,
    "lastReadMessageId" | "lastNotifiedMessageId"
  > | null,
): boolean => !hasUnreadWaveNotification(inboxState);

export const toPRMessageThreadItem = (
  message: PRMessageWithAuthor,
): PRMessageThreadItem => ({
  id: message.id,
  body: message.body,
  createdAt: message.createdAt.toISOString(),
  author: {
    userId: message.authorUserId,
    nickname: message.authorNickname?.trim() || null,
    avatarUrl: message.authorAvatar,
  },
});

export const buildPRMessageThreadState = (
  latestVisibleMessageId: PRMessageId | null,
  inboxState: Pick<PRMessageInboxState, "lastReadMessageId"> | null,
): PRMessageThreadState => {
  const lastReadMessageId = inboxState?.lastReadMessageId ?? null;

  return {
    canPost: true,
    latestVisibleMessageId,
    lastReadMessageId,
    hasUnread: hasUnreadPRMessages({
      latestVisibleMessageId,
      lastReadMessageId,
    }),
  };
};

export const buildPRMessageThreadResponse = (input: {
  messages: PRMessageWithAuthor[];
  inboxState: Pick<PRMessageInboxState, "lastReadMessageId"> | null;
}): PRMessageThreadResponse => {
  const latestVisibleMessageId =
    input.messages[input.messages.length - 1]?.id ?? null;

  return {
    items: input.messages.map(toPRMessageThreadItem),
    thread: buildPRMessageThreadState(latestVisibleMessageId, input.inboxState),
  };
};
