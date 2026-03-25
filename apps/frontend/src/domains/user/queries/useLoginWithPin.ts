import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { AuthSessionPayload } from "@/shared/auth/useUserSessionStore";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

type LoginWithPinInput = {
  userId: string;
  userPin: string;
};

export const useLoginWithPin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      userPin,
    }: LoginWithPinInput): Promise<AuthSessionPayload> => {
      const res = await client.api.auth.session.$post(
        {
          json: {
            userId,
            userPin,
          },
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
          error.error || i18n.global.t("errors.loginWithPinFailed"),
        );
      }

      return (await res.json()) as AuthSessionPayload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.me(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineCreated(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.wechat.notificationSubscriptions(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.wechat.reminderSubscription(),
      });
    },
  });
};
