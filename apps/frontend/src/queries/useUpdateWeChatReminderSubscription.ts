import { useMutation, useQueryClient } from "@tanstack/vue-query";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

type UpdateWeChatReminderSubscriptionInput = {
  enabled: boolean;
};

export const useUpdateWeChatReminderSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ enabled }: UpdateWeChatReminderSubscriptionInput) => {
      const res = await client.api.wechat.reminders.subscription.$post(
        {
          json: { enabled },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error ||
            i18n.global.t("errors.updateWechatReminderSubscriptionFailed"),
        );
      }

      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.wechat.reminderSubscription(),
      });
    },
  });
};

