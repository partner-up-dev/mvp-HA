import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { PartnerRequestFields, PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";

interface UpdateContentInput {
  id: PRId;
  fields: PartnerRequestFields;
  pin: string;
}

export const useUpdatePRContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields, pin }: UpdateContentInput) => {
      const res = await client.api.pr[":id"].content.$patch({
        param: { id: id.toString() },
        json: { fields, pin },
      });

      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(error.error || i18n.global.t("errors.updateContentFailed"));
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
