import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

type ConfirmInput = {
  id: PRId;
};

export const useConfirmPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: ConfirmInput) => {
      const res = await client.api.pr[":id"].confirm.$post(
        {
          param: { id: id.toString() },
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
          error.error || i18n.global.t("errors.confirmSlotFailed"),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["partner-request", variables.id],
      });
    },
  });
};
