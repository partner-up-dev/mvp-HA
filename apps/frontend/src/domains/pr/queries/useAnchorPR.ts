import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import { computed, type Ref } from "vue";
import type { InferResponseType } from "hono";
import type { PartnerRequestFields, PRId, PRStatusManual } from "@partner-up-dev/backend";
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
import { handleWeChatAuthRequiredError } from "@/processes/wechat/auth-error";
import {
  useUserSessionStore,
  type AuthSessionPayload,
} from "@/shared/auth/useUserSessionStore";

type AnchorPRActionInput = {
  id: PRId;
};
type AnchorPRJoinInput = AnchorPRActionInput & {
  wechatPhoneCredential?: string | null;
};
type AnchorPRVerifyBookingContactInput = {
  id: PRId;
  wechatPhoneCredential: string;
};

type AnchorPRCheckInInput = {
  id: PRId;
  didAttend: boolean;
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

type TimeWindow = [string | null, string | null];
const ANCHOR_USER_AUTH_REQUIRED_CODE = "ANCHOR_USER_AUTH_REQUIRED";
const WECHAT_BIND_REQUIRED_CODE = "WECHAT_BIND_REQUIRED";
const BOOKING_CONTACT_OWNER_REQUIRED_CODE = "BOOKING_CONTACT_OWNER_REQUIRED";
const BOOKING_CONTACT_REQUIRED_CODE = "BOOKING_CONTACT_REQUIRED";
const WECHAT_PHONE_VERIFY_FAILED_CODE = "WECHAT_PHONE_VERIFY_FAILED";

export type AnchorPRDetailResponse = InferResponseType<
  (typeof client.api.apr)[":id"]["$get"]
>;

export type AnchorPRBookingSupportResponse = InferResponseType<
  (typeof client.api.apr)[":id"]["booking-support"]["$get"]
>;

export type AnchorAlternativeBatchesResponse = InferResponseType<
  (typeof client.api.apr)[":id"]["alternative-batches"]["$get"]
>;

export type AcceptAnchorAlternativeBatchResponse = InferResponseType<
  (typeof client.api.apr)[":id"]["accept-alternative-batch"]["$post"]
>;

export type AnchorReimbursementStatusResponse = InferResponseType<
  (typeof client.api.apr)[":id"]["reimbursement"]["status"]["$get"]
>;

export type VerifyAnchorPRBookingContactResponse = InferResponseType<
  (typeof client.api.apr)[":id"]["booking-contact"]["verify"]["$post"]
>;

const resolveErrorMessage = (
  response: Response,
  payload: ApiErrorPayload | null,
  fallback: string,
): string => {
  if (
    typeof window !== "undefined" &&
    handleWeChatAuthRequiredError(response.status, payload, window.location.href)
  ) {
    return resolveApiErrorMessage(payload, i18n.global.t("prPage.wechatReminder.loginHint"));
  }

  return resolveApiErrorMessage(payload, fallback);
};

const isAnchorUserAuthRequiredError = (
  response: Response,
  payload: ApiErrorPayload | null,
): boolean =>
  response.status === 401 && payload?.code === ANCHOR_USER_AUTH_REQUIRED_CODE;

const isWeChatBindRequiredError = (
  response: Response,
  payload: ApiErrorPayload | null,
): boolean => response.status === 401 && payload?.code === WECHAT_BIND_REQUIRED_CODE;

const isBookingContactOwnerRequiredError = (
  payload: ApiErrorPayload | null,
): boolean => payload?.code === BOOKING_CONTACT_OWNER_REQUIRED_CODE;

const isBookingContactRequiredError = (
  payload: ApiErrorPayload | null,
): boolean => payload?.code === BOOKING_CONTACT_REQUIRED_CODE;

const isWeChatPhoneVerifyFailedError = (
  payload: ApiErrorPayload | null,
): boolean => payload?.code === WECHAT_PHONE_VERIFY_FAILED_CODE;

const resolveRegisterLocalAccountError = (
  payload: ApiErrorPayload | null,
): string =>
  resolveApiErrorMessage(
    payload,
    i18n.global.t("errors.registerLocalAccountFailed"),
  );

export const useAnchorPR = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.anchorPR.detail(id.value));

  return useQuery<AnchorPRDetailResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.apr[":id"].$get(
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

export const useAnchorPRBookingSupport = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.anchorPR.bookingSupport(id.value));

  return useQuery<AnchorPRBookingSupportResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.apr[":id"]["booking-support"].$get(
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
  const userSessionStore = useUserSessionStore();

  return useMutation({
    mutationFn: async ({
      id,
      wechatPhoneCredential = null,
    }: AnchorPRJoinInput) => {
      const requestJoin = async () =>
        client.api.apr[":id"].join.$post(
          {
            param: { id: id.toString() },
            json: wechatPhoneCredential
              ? { wechatPhoneCredential }
              : {},
          },
          {
            init: {
              credentials: "include",
            },
          },
        );

      let res = await requestJoin();
      let payload = res.ok ? null : await readApiErrorPayload(res);

      if (isAnchorUserAuthRequiredError(res, payload)) {
        const registerRes = await client.api.auth.register.local.$post();
        const registerPayload = registerRes.ok
          ? ((await registerRes.json()) as AuthSessionPayload)
          : null;

        if (!registerRes.ok || !registerPayload) {
          const registerErrorPayload = registerRes.ok
            ? null
            : await readApiErrorPayload(registerRes);
          throw buildApiError(
            resolveRegisterLocalAccountError(registerErrorPayload),
            registerErrorPayload,
          );
        }

        userSessionStore.applyAuthSession(registerPayload);
        res = await requestJoin();
        payload = res.ok ? null : await readApiErrorPayload(res);
      }

      if (isWeChatBindRequiredError(res, payload)) {
        const rehydrateRes = await client.api.auth.session.$post(
          {
            json: {
              userId: null,
              userPin: null,
            },
          },
          {
            init: {
              credentials: "include",
              headers: {
                Authorization: "",
              },
            },
          },
        );

        if (rehydrateRes.ok) {
          const rehydratedSession = (await rehydrateRes.json()) as AuthSessionPayload;
          userSessionStore.applyAuthSession(rehydratedSession);

          if (rehydratedSession.userId) {
            res = await requestJoin();
            payload = res.ok ? null : await readApiErrorPayload(res);
          }
        }
      }

      if (!res.ok) {
        const fallbackMessage = isBookingContactOwnerRequiredError(payload)
          ? i18n.global.t("prPage.bookingContact.ownerVerifyBeforeJoin")
          : isBookingContactRequiredError(payload)
          ? i18n.global.t("prPage.bookingContact.ownerBlockedHint")
          : isWeChatPhoneVerifyFailedError(payload)
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
        queryKey: queryKeys.anchorPR.bookingSupport(variables.id),
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
      const res = await client.api.apr[":id"].exit.$post(
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
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useConfirmAnchorPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: AnchorPRActionInput) => {
      const res = await client.api.apr[":id"].confirm.$post(
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
        const fallbackMessage = isBookingContactRequiredError(payload)
          ? i18n.global.t("prPage.bookingContact.ownerVerifyBeforeConfirm")
          : i18n.global.t("errors.confirmSlotFailed");
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
    },
  });
};

export const useVerifyAnchorPRBookingContact = () => {
  const queryClient = useQueryClient();

  return useMutation<
    VerifyAnchorPRBookingContactResponse,
    Error,
    AnchorPRVerifyBookingContactInput
  >({
    mutationFn: async ({ id, wechatPhoneCredential }) => {
      const res = await client.api.apr[":id"]["booking-contact"]["verify"].$post(
        {
          param: { id: id.toString() },
          json: { wechatPhoneCredential },
        },
        {
          init: {
            credentials: "include",
          },
        },
      );

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        const fallbackMessage = isWeChatPhoneVerifyFailedError(payload)
          ? i18n.global.t("prPage.bookingContact.verifyFailed")
          : i18n.global.t("errors.verifyBookingContactFailed");
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
        queryKey: queryKeys.anchorPR.bookingSupport(variables.id),
      });
    },
  });
};

export const useCheckInAnchorPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      didAttend,
      wouldJoinAgain,
    }: AnchorPRCheckInInput) => {
      const res = await client.api.apr[":id"]["check-in"].$post(
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
    },
  });
};

export const useAnchorAlternativeBatches = (
  id: Ref<PRId | null>,
  enabled: Ref<boolean>,
) => {
  const queryKey = computed(() => queryKeys.anchorPR.alternativeBatches(id.value));

  return useQuery<AnchorAlternativeBatchesResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error("缺少搭子请求 ID");
      }

      const res = await client.api.apr[":id"]["alternative-batches"].$get({
        param: { id: prId.toString() },
      });

      if (!res.ok) {
        throw new Error("获取其它时段推荐失败");
      }

      return await res.json();
    },
    enabled: () => enabled.value && id.value !== null,
  });
};

export const useAcceptAnchorAlternativeBatch = () => {
  const queryClient = useQueryClient();

  return useMutation<
    AcceptAnchorAlternativeBatchResponse,
    Error,
    { id: PRId; targetTimeWindow: TimeWindow }
  >({
    mutationFn: async ({ id, targetTimeWindow }) => {
      const res = await client.api.apr[":id"]["accept-alternative-batch"].$post({
        param: { id: id.toString() },
        json: { targetTimeWindow },
      });

      if (!res.ok) {
        const payload = await readApiErrorPayload(res);
        throw new Error(resolveErrorMessage(res, payload, "接受其它时段推荐失败"));
      }

      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorPR.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.anchorPR.alternativeBatches(variables.id),
      });
    },
  });
};

export const useAnchorReimbursementStatus = (id: Ref<PRId | null>) => {
  const queryKey = computed(() => queryKeys.anchorPR.reimbursementStatus(id.value));

  return useQuery<AnchorReimbursementStatusResponse>({
    queryKey,
    queryFn: async () => {
      const prId = id.value;
      if (prId === null) {
        throw new Error(i18n.global.t("errors.missingPartnerRequestId"));
      }

      const res = await client.api.apr[":id"].reimbursement.status.$get(
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
    enabled: () => id.value !== null,
  });
};

export const useUpdateAnchorPRContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields, pin }: AnchorPRUpdateContentInput) => {
      const requestFields: PartnerRequestFields = {
        title: fields.title,
        type: fields.type,
        time: [fields.time[0], fields.time[1]],
        location: fields.location,
        minPartners: fields.minPartners,
        maxPartners: fields.maxPartners,
        partners: [...fields.partners],
        budget: null,
        preferences: [...fields.preferences],
        notes: fields.notes,
      };
      const requestBody = pin
        ? { fields: requestFields, pin }
        : { fields: requestFields };
      const res = await client.api.apr[":id"].content.$patch({
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
    },
  });
};

export const useUpdateAnchorPRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, pin }: AnchorPRUpdateStatusInput) => {
      const res = await client.api.apr[":id"].status.$patch({
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
    },
  });
};
