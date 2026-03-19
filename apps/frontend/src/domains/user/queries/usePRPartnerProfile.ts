import { useQuery } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";

export type PRPartnerProfileScenario = "COMMUNITY" | "ANCHOR";

type CommunityPRPartnerProfileResponse = InferResponseType<
  (typeof client.api.cpr)[":id"]["partners"][":partnerId"]["profile"]["$get"]
>;

type AnchorPRPartnerProfileResponse = InferResponseType<
  (typeof client.api.apr)[":id"]["partners"][":partnerId"]["profile"]["$get"]
>;

export type PRPartnerProfileResponse =
  | CommunityPRPartnerProfileResponse
  | AnchorPRPartnerProfileResponse;

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export const usePRPartnerProfile = (
  scenario: Ref<PRPartnerProfileScenario | null>,
  prId: Ref<number | null>,
  partnerId: Ref<number | null>,
) => {
  const queryKey = computed(() =>
    queryKeys.pr.partnerProfile(scenario.value ?? "COMMUNITY", prId.value, partnerId.value),
  );

  return useQuery<PRPartnerProfileResponse>({
    queryKey,
    queryFn: async () => {
      const activeScenario = scenario.value;
      const activePrId = prId.value;
      const activePartnerId = partnerId.value;

      if (!activeScenario || activePrId === null || activePartnerId === null) {
        throw new Error(i18n.global.t("errors.fetchRequestFailed"));
      }

      const res =
        activeScenario === "COMMUNITY"
          ? await client.api.cpr[":id"].partners[":partnerId"].profile.$get({
              param: {
                id: activePrId.toString(),
                partnerId: activePartnerId.toString(),
              },
            })
          : await client.api.apr[":id"].partners[":partnerId"].profile.$get({
              param: {
                id: activePrId.toString(),
                partnerId: activePartnerId.toString(),
              },
            });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(res, i18n.global.t("errors.fetchRequestFailed")),
        );
      }

      return await res.json();
    },
    enabled: () =>
      Boolean(scenario.value) && prId.value !== null && partnerId.value !== null,
  });
};
