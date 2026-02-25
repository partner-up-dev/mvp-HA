import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

type CheckInInput = {
  id: PRId;
  didAttend: boolean;
  wouldJoinAgain: boolean | null;
};

export const useCheckInPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      didAttend,
      wouldJoinAgain,
    }: CheckInInput) => {
      const res = await client.api.pr[":id"]["check-in"].$post(
        {
          param: { id: id.toString() },
          json: {
            didAttend,
            wouldJoinAgain,
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
          error.error || i18n.global.t("errors.checkInSlotFailed"),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};
