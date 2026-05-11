import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { InferResponseType } from "hono";
import type { PRId } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";
import {
  buildApiError,
  readApiErrorPayload,
  resolveApiErrorMessage,
} from "@/shared/api/error";

export type PRBookingSupportResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["booking-support"]["$get"]
>;

export type PRReimbursementStatusResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["reimbursement"]["status"]["$get"]
>;

export type UpdatePRBookingContactPhoneResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["booking-contact"]["phone"]["$put"]
>;

type UpdatePRBookingContactPhoneInput = {
  id: PRId;
  phone: string;
};

const resolveErrorMessage = (
  response: Response,
  fallback: string,
): Promise<string> =>
  readApiErrorPayload(response).then((payload) =>
    resolveApiErrorMessage(payload, fallback),
  );

export const usePRBookingSupport = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.pr.bookingSupport(id.value));

  return useQuery<PRBookingSupportResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.pr[":id"]["booking-support"].$get(
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

export const usePRReimbursementStatus = (
  id: Ref<PRId | null>,
  queryEnabled?: Ref<boolean>,
) => {
  const enabled = computed(
    () => id.value !== null && (queryEnabled?.value ?? true),
  );
  const queryKey = computed(() => queryKeys.pr.reimbursementStatus(id.value));

  return useQuery<PRReimbursementStatusResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.pr[":id"].reimbursement.status.$get(
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
        throw new Error(
          await resolveErrorMessage(
            res,
            i18n.global.t("errors.fetchReimbursementStatusFailed"),
          ),
        );
      }

      return await res.json();
    },
    enabled: () => enabled.value,
  });
};

export const useUpdatePRBookingContactPhone = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdatePRBookingContactPhoneResponse,
    Error,
    UpdatePRBookingContactPhoneInput
  >({
    mutationFn: async ({ id, phone }) => {
      const res = await client.api.pr[":id"]["booking-contact"]["phone"].$put(
        {
          param: { id: id.toString() },
          json: { phone },
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
            i18n.global.t("errors.verifyBookingContactFailed"),
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
        queryKey: queryKeys.pr.bookingSupport(variables.id),
      });
    },
  });
};
