import assert from "node:assert/strict";
import test from "node:test";

process.env.DATABASE_URL ??= "postgresql://localhost:5432/partnerup_test";

test("sendPRMessageNotification maps batch summary fields to PR_MESSAGE keywords", async () => {
  const { WeChatSubscriptionMessageService } = await import(
    "./WeChatSubscriptionMessageService"
  );
  const service = new WeChatSubscriptionMessageService();
  type CapturedMessage = {
    kind: string;
    openId: string;
    page: string | null;
    data: Record<string, { value: string }>;
  };
  let captured: CapturedMessage | null = null;

  (
    service as unknown as {
      sendSubscribeMessage: (input: CapturedMessage) => Promise<string | number | null>;
    }
  ).sendSubscribeMessage = async (input) => {
    captured = input;
    return null;
  };

  await service.sendPRMessageNotification({
    openId: "openid-123",
    threadTitle: "周三羽球搭子",
    authorName: "小明",
    sentAt: "2026/04/14 12:30",
    messageSummary: "3条留言，请尽快查看",
    page: "/apr/42",
  });

  assert.deepEqual(captured, {
    kind: "PR_MESSAGE",
    openId: "openid-123",
    page: "/apr/42",
    data: {
      thing5: { value: "周三羽球搭子" },
      time2: { value: "2026/04/14 12:30" },
      name3: { value: "小明" },
      thing4: { value: "3条留言，请尽快查看" },
    },
  });
});
