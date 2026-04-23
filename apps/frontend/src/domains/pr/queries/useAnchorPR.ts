import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { InferResponseType } from "hono";
import type {
  PRId,
  PRStatusManual,
} from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";
import type { AnchorPRFormFields } from "@/domains/pr/model/types";
import {
  buildApiError,
  type ApiErrorPayload,
  readApiErrorPayload,
  resolveApiErrorMessage,
} from "@/shared/api/error";
import {
  handleWeChatAuthRequiredError,
  isWeChatAuthRequiredError,
} from "@/processes/wechat/auth-error";
import { setPendingWeChatAction } from "@/processes/wechat/pending-wechat-action";

type AnchorPRActionInput = {
  id: PRId;
};
type AnchorPRJoinInput = AnchorPRActionInput & {
  bookingContactPhone?: string | null;
};
type AnchorPRUpdateBookingContactPhoneInput = {
  id: PRId;
  phone: string;
};

type AnchorPRCheckInInput = {
  id: PRId;
  wouldJoinAgain: boolean | null;
};

type AnchorPRUpdateContentInput = {
  id: PRId;
  fields: AnchorPRFormFields;
  pin?: string;
};

type AnchorPRUpdateStatusInput = {
  id: PRId;
  status: PRStatusManual;
  pin?: string;
};

const BOOKING_CONTACT_PHONE_REQUIRED_CODE = "BOOKING_CONTACT_PHONE_REQUIRED";
const BOOKING_CONTACT_PHONE_INVALID_CODE = "BOOKING_CONTACT_PHONE_INVALID";

type PRDetailResponse = InferResponseType<(typeof client.api.pr)[":id"]["$get"]>;
export type AnchorPRDetailResponse = Extract<
  PRDetailResponse,
  { prKind: "ANCHOR" }
>;
export type AnchorPRDetailView = AnchorPRDetailResponse;

export type AnchorPRBookingSupportResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["booking-support"]["$get"]
>;

export type AnchorReimbursementStatusResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["reimbursement"]["status"]["$get"]
>;

export type UpdateAnchorPRBookingContactPhoneResponse = InferResponseType<
  (typeof client.api.pr)[":id"]["booking-contact"]["phone"]["$put"]
>;

const resolveErrorMessage = (
  response: Response,
  payload: ApiErrorPayload | null,
  fallback: string,
): string => {
  if (
    typeof window !== "undefined" &&
    handleWeChatAuthRequiredError(
      response.status,
      payload,
      window.location.href,
    )
  ) {
    return resolveApiErrorMessage(
      payload,
      i18n.global.t("prPage.wechatReminder.loginHint"),
    );
  }

  return resolveApiErrorMessage(payload, fallback);
};

const isBookingContactPhoneRequiredError = (
  payload: ApiErrorPayload | null,
): boolean => payload?.code === BOOKING_CONTACT_PHONE_REQUIRED_CODE;

const isBookingContactPhoneInvalidError = (
  payload: ApiErrorPayload | null,
): boolean => payload?.code === BOOKING_CONTACT_PHONE_INVALID_CODE;

export const useAnchorPR = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.anchorPR.detail(id.value));

  return useQuery<AnchorPRDetailView>({
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
      if (detail.prKind !== "ANCHOR") {
        throw new Error("Anchor PR not found");
      }

      return detail as AnchorPRDetailView;
    },
    enabled: () => id.value !== null,
  });
};

export const useAnchorPRBookingSupport = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.pr.bookingSupport(id.value));

  return useQuery<AnchorPRBookingSupportResponse>({
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

export const useJoinAnchorPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      bookingContactPhone = null,
    }: AnchorPRJoinInput) => {
      const requestJoin = async () =>
        client.api.pr[":id"].join.$post(
          {
            param: { id: id.toString() },
            json: bookingContactPhone ? { bookingContactPhone } : {},
          },
          {
            init: {
              credentials: "include",
            },
          },
        );

      let res = await requestJoin();
      let payload = res.ok ? null : await readApiErrorPayload(res);

      if (!res.ok) {
        if (isWeChatAuthRequiredError(res.status, payload)) {
          setPendingWeChatAction({
            kind: "ANCHOR_PR_JOIN",
            prId: id,
          });
        }
        const fallbackMessage = isBookingContactPhoneRequiredError(payload)
            ? i18n.global.t("prPage.bookingContact.ownerVerifyBeforeJoin")
            : isBookingContactPhoneInvalidError(payload)
              ? i18n.global.t("prPage.bookingContact.verifyFailed")
              : i18n.global.t("errors.joinRequestFailed");
        throw buildApiError(
          resolveErrorMessage(res, payload, fallbackMessage),
          payload,
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.bookingSupport(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useExitAnchorPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: AnchorPRActionInput) => {
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
        const payload = await readApiErrorPayload(res);
        if (isWeChatAuthRequiredError(res.status, payload)) {
          setPendingWeChatAction({
            kind: "ANCHOR_PR_EXIT",
            prId: id,
          });
        }
        throw new Error(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.exitRequestFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useConfirmAnchorPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: AnchorPRActionInput) => {
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
        const payload = await readApiErrorPayload(res);
        if (isWeChatAuthRequiredError(res.status, payload)) {
          setPendingWeChatAction({
            kind: "ANCHOR_PR_CONFIRM",
            prId: id,
          });
        }
        throw buildApiError(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.confirmSlotFailed"),
          ),
          payload,
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};

export const useUpdateAnchorPRBookingContactPhone = () => {
  const queryClient = useQueryClient();

  return useMutation<
    UpdateAnchorPRBookingContactPhoneResponse,
    Error,
    AnchorPRUpdateBookingContactPhoneInput
  >({
    mutationFn: async ({ id, phone }) => {
      const res = await client.api.pr[":id"]["booking-contact"][
        "phone"
      ].$put(
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
          resolveErrorMessage(
            res,
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
        queryKey: queryKeys.anchorPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.bookingSupport(variables.id),
      });
    },
  });
};

export const useCheckInAnchorPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, wouldJoinAgain }: AnchorPRCheckInInput) => {
      const res = await client.api.pr[":id"]["check-in"].$post(
        {
          param: { id: id.toString() },
          json: {
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
        if (res.status === 403) {
          return {
            eligible: false,
            canRequest: false,
            requested: false,
            reimbursementStatus: "NONE",
            reimbursementAmount: null,
            reason: "SLOT_NOT_ELIGIBLE",
          };
        }

        const payload = await readApiErrorPayload(res);
        throw new Error(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.checkInSlotFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};

export const useAnchorReimbursementStatus = (
  id: Ref<PRId | null>,
  queryEnabled?: Ref<boolean>,
) => {
  const enabled = computed(
    () => id.value !== null && (queryEnabled?.value ?? true),
  );
  const queryKey = computed(() =>
    queryKeys.pr.reimbursementStatus(id.value),
  );

  return useQuery<AnchorReimbursementStatusResponse>({
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
        const payload = await readApiErrorPayload(res);
        throw new Error(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.fetchReimbursementStatusFailed"),
          ),
        );
      }

      return await res.json();
    },
    enabled: () => enabled.value,
  });
};

export const useUpdateAnchorPRContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields, pin }: AnchorPRUpdateContentInput) => {
      const requestFields = {
        title: fields.title,
        type: fields.type,
        location: fields.location,
        minPartners: fields.minPartners,
        maxPartners: fields.maxPartners,
        partners: [...fields.partners],
        preferences: [...fields.preferences],
        notes: fields.notes,
      };
      const requestBody = pin
        ? { fields: requestFields, pin }
        : { fields: requestFields };
      const res = await client.api.pr[":id"].content.$patch({
        param: { id: id.toString() },
        json: requestBody,
      });

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw new Error(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.updateContentFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};

export const useUpdateAnchorPRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, pin }: AnchorPRUpdateStatusInput) => {
      const res = await client.api.pr[":id"].status.$patch({
        param: { id: id.toString() },
        json: pin ? { status, pin } : { status },
      });

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw new Error(
          resolveErrorMessage(
            res,
            payload,
            i18n.global.t("errors.updateStatusFailed"),
          ),
        );
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};
