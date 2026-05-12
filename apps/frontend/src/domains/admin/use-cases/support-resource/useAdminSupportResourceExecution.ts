import type { MaybeRef } from "vue";
import {
  type AdminBookingExecutionInput,
  type AdminBookingExecutionWorkspaceResponse,
  type AdminPRPartnerReleaseInput,
  useAdminBookingExecutionWorkspace,
  useReleaseAdminPRPartnerForExecution,
  useSubmitAdminPRBookingExecution,
} from "@/domains/admin/queries/useAdminBookingExecution";

export type AdminSupportResourceExecutionWorkspace =
  NonNullable<AdminBookingExecutionWorkspaceResponse>;
export type AdminSupportResourcePendingItem =
  AdminSupportResourceExecutionWorkspace["pendingItems"][number];
export type AdminSupportResourceAuditItem =
  AdminSupportResourceExecutionWorkspace["auditItems"][number];

export const useAdminSupportResourceExecution = (
  enabled: MaybeRef<boolean> = true,
) => {
  const workspaceQuery = useAdminBookingExecutionWorkspace(enabled);
  const submitExecutionMutation = useSubmitAdminPRBookingExecution();
  const releasePartnerMutation = useReleaseAdminPRPartnerForExecution();

  const submitExecution = async ({
    prId,
    input,
  }: {
    prId: number;
    input: AdminBookingExecutionInput;
  }) =>
    await submitExecutionMutation.mutateAsync({
      prId,
      input,
    });

  const releasePartner = async ({
    prId,
    partnerId,
    input,
  }: {
    prId: number;
    partnerId: number;
    input: AdminPRPartnerReleaseInput;
  }) =>
    await releasePartnerMutation.mutateAsync({
      prId,
      partnerId,
      input,
    });

  const reset = () => {
    submitExecutionMutation.reset();
    releasePartnerMutation.reset();
  };

  return {
    workspaceQuery,
    submitExecution,
    releasePartner,
    isPending: {
      submitExecution: submitExecutionMutation.isPending,
      releasePartner: releasePartnerMutation.isPending,
    },
    errors: {
      submitExecution: submitExecutionMutation.error,
      releasePartner: releasePartnerMutation.error,
    },
    reset,
  };
};
