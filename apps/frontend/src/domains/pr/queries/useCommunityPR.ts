import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { InferResponseType } from "hono";
import type {
  PartnerRequestFields,
  PRId,
  PRStatusManual,
  WeekdayLabel,
} from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";

type CreateDraftResult = { id: PRId };

type CreateCommunityPRFromNaturalLanguageInput = {
  rawText: string;
  nowIso: string;
  nowWeekday: WeekdayLabel;
};

type CreateCommunityPRFromStructuredInput = {
  fields: PartnerRequestFields;
};

type UpdateCommunityPRContentInput = {
  id: PRId;
  fields: PartnerRequestFields;
  pin?: string;
};

type UpdateCommunityPRStatusInput = {
  id: PRId;
  status: PRStatusManual;
  pin?: string;
};

type CommunityPRActionInput = {
  id: PRId;
};

export type CommunityPRDetailResponse = InferResponseType<
  (typeof client.api.cpr)[":id"]["$get"]
>;

export type PublishCommunityPRResponse = InferResponseType<
  (typeof client.api.cpr)[":id"]["publish"]["$post"]
>;

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export const useCommunityPR = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.communityPR.detail(id.value));

  return useQuery<CommunityPRDetailResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.cpr[":id"].$get(
        {
          param: { id: prId.toString() },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        throw new Error(i18n.global.t("errors.fetchRequestFailed"));
      }

      return await res.json();
    },
    enabled: () => id.value !== null,
  });
};

export const useCreateCommunityPRFromNaturalLanguage = () => {
  return useMutation<
    CreateDraftResult,
    Error,
    CreateCommunityPRFromNaturalLanguageInput
  >({
    mutationFn: async (input) => {
      const res = await client.api.cpr.natural_language.$post({
        json: input,
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            i18n.global.t("errors.createRequestFailed"),
          ),
        );
      }

      return await res.json();
    },
  });
};

export const useCreateCommunityPRFromStructured = () => {
  return useMutation<
    CreateDraftResult,
    Error,
    CreateCommunityPRFromStructuredInput
  >({
    mutationFn: async (input) => {
      const res = await client.api.cpr.$post({
        json: input.fields,
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            i18n.global.t("errors.createRequestFailed"),
          ),
        );
      }

      return await res.json();
    },
  });
};

export const usePublishCommunityPR = () => {
  const queryClient = useQueryClient();

  return useMutation<PublishCommunityPRResponse, Error, { id: PRId }>({
    mutationFn: async ({ id }) => {
      const res = await client.api.cpr[":id"].publish.$post({
        param: { id: id.toString() },
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            i18n.global.t("errors.publishRequestFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_payload, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communityPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineCreated(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useJoinCommunityPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: CommunityPRActionInput) => {
      const res = await client.api.cpr[":id"].join.$post(
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
        throw new Error(
          await readErrorMessage(res, i18n.global.t("errors.joinRequestFailed")),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communityPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useExitCommunityPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: CommunityPRActionInput) => {
      const res = await client.api.cpr[":id"].exit.$post(
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
        throw new Error(
          await readErrorMessage(res, i18n.global.t("errors.exitRequestFailed")),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communityPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useUpdateCommunityPRContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      fields,
      pin,
    }: UpdateCommunityPRContentInput) => {
      const res = await client.api.cpr[":id"].content.$patch({
        param: { id: id.toString() },
        json: pin ? { fields, pin } : { fields },
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            i18n.global.t("errors.updateContentFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communityPR.detail(variables.id),
      });
    },
  });
};

export const useUpdateCommunityPRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      pin,
    }: UpdateCommunityPRStatusInput) => {
      const res = await client.api.cpr[":id"].status.$patch({
        param: { id: id.toString() },
        json: pin ? { status, pin } : { status },
      });

      if (!res.ok) {
        throw new Error(
          await readErrorMessage(
            res,
            i18n.global.t("errors.updateStatusFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.communityPR.detail(variables.id),
      });
    },
  });
};
