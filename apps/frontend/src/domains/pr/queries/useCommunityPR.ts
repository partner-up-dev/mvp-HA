import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { InferResponseType } from "hono";
import type {
  PartnerRequestFields,
  PRId,
  PRStatusManual,
} from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";
import {
  buildApiError,
  readApiErrorPayload,
  resolveApiErrorMessage,
} from "@/shared/api/error";
export {
  useCreatePRFromNaturalLanguage as useCreateCommunityPRFromNaturalLanguage,
  useCreatePRFromStructured as useCreateCommunityPRFromStructured,
} from "./usePRCreate";

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
  (typeof client.api.pr)[":id"]["$get"]
>;
type PRDetailResponse = InferResponseType<(typeof client.api.pr)[":id"]["$get"]>;

export type PublishCommunityPRResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["publish"]["$post"]
>;

export type JoinCommunityPRResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["join"]["$post"]
>;

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export const useCommunityPR = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.pr.detail(id.value));

  return useQuery<CommunityPRDetailResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.pr[":id"].$get(
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

      const detail = (await res.json()) as PRDetailResponse;
      if (detail.prKind !== "COMMUNITY") {
        throw new Error("Community PR not found");
      }

      return detail as CommunityPRDetailResponse;
    },
    enabled: () => id.value !== null,
  });
};

export const usePublishCommunityPR = () => {
  const queryClient = useQueryClient();

  return useMutation<PublishCommunityPRResponse, Error, { id: PRId }>({
    mutationFn: async ({ id }) => {
      const res = await client.api.pr[":id"].publish.$post({
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
        queryKey: queryKeys.pr.detail(variables.id),
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

  return useMutation<JoinCommunityPRResponse, Error, CommunityPRActionInput>({
    mutationFn: async ({ id }: CommunityPRActionInput) => {
      const res = await client.api.pr[":id"].join.$post(
        {
          param: { id: id.toString() },
          json: {},
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw buildApiError(
          resolveApiErrorMessage(
            payload,
            i18n.global.t("errors.joinRequestFailed"),
          ),
          payload,
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
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
      const res = await client.api.pr[":id"].exit.$post(
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
        queryKey: queryKeys.pr.detail(variables.id),
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
      const res = await client.api.pr[":id"].content.$patch({
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
        queryKey: queryKeys.pr.detail(variables.id),
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
      const res = await client.api.pr[":id"].status.$patch({
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
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};
