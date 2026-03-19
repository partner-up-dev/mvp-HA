import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { AuthSessionPayload } from "@/shared/auth/useUserSessionStore";
import { client } from "@/lib/rpc";
import { queryKeys } from "@/shared/api/query-keys";
import { i18n } from "@/locales/i18n";

export const useRegisterLocalAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<AuthSessionPayload> => {
      const res = await client.api.auth.register.local.$post();
      if (!res.ok) {
        const error = (await res.json()) as { error?: string };
        throw new Error(
          error.error || i18n.global.t("errors.registerLocalAccountFailed"),
        );
      }

      return (await res.json()) as AuthSessionPayload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.user.me(),
      });
    },
  });
};
