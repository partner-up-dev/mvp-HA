import { useMutation, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import type { PRId, PRStatusManual } from "@partner-up-dev/backend";
import { client } from "@/lib/rpc";
import { i18n } from "@/locales/i18n";
import { queryKeys } from "@/shared/api/query-keys";
import type { PRFormFields } from "@/domains/pr/model/types";
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

type PRActionInput = {
  id: PRId;
};

type PRJoinInput = PRActionInput & {
  bookingContactPhone?: string | null;
};

type PRCheckInInput = {
  id: PRId;
  wouldJoinAgain: boolean | null;
};

type PRUpdateContentInput = {
  id: PRId;
  fields: PRFormFields;
  pin?: string;
};

type PRUpdateStatusInput = {
  id: PRId;
  status: PRStatusManual;
  pin?: string;
};

const BOOKING_CONTACT_PHONE_REQUIRED_CODE = "BOOKING_CONTACT_PHONE_REQUIRED";
const BOOKING_CONTACT_PHONE_INVALID_CODE = "BOOKING_CONTACT_PHONE_INVALID";

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

export const useJoinPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      bookingContactPhone = null,
    }: PRJoinInput) => {
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

      const res = await requestJoin();
      const payload = res.ok ? null : await readApiErrorPayload(res);

      if (!res.ok) {
        if (isWeChatAuthRequiredError(res.status, payload)) {
          setPendingWeChatAction({
            kind: "PR_JOIN",
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

export const useExitPR = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: PRActionInput) => {
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
            kind: "PR_EXIT",
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
        queryKey: queryKeys.pr.detail(variables.id),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.pr.mineJoined(),
      });
    },
  });
};

export const useConfirmPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id }: PRActionInput) => {
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
            kind: "PR_CONFIRM",
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
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};

export const useCheckInPRSlot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, wouldJoinAgain }: PRCheckInInput) => {
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
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};

export const useUpdatePRContent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, fields, pin }: PRUpdateContentInput) => {
      const res = await client.api.pr[":id"].content.$patch({
        param: { id: id.toString() },
        json: pin ? { fields, pin } : { fields },
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
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};

export const useUpdatePRStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status, pin }: PRUpdateStatusInput) => {
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
        queryKey: queryKeys.pr.detail(variables.id),
      });
    },
  });
};
