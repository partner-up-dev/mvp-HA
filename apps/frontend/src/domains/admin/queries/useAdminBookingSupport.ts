import { useMutation, useQuery, useQueryClient } from "@tanstack/vue-query";
import type { InferResponseType } from "hono";
import { computed, type Ref } from "vue";
import { adminClient } from "@/lib/admin-rpc";
import { queryKeys } from "@/shared/api/query-keys";

type BookingHandledBy = "PLATFORM" | "PLATFORM_PASSTHROUGH" | "USER";

export type AdminBookingSupportConfigResponse = InferResponseType<
  (typeof adminClient.api.admin.events)[":eventId"]["booking-support-resources"]["$get"]
>;

export type ReplaceEventBookingSupportResourcesResponse = InferResponseType<
  (typeof adminClient.api.admin.events)[":eventId"]["booking-support-resources"]["$put"]
>;

export type EventSupportResourceInput = {
  code: string;
  title: string;
  resourceKind: "VENUE" | "ITEM" | "SERVICE" | "OTHER";
  appliesToAllLocations: boolean;
  locationIds: string[];
  bookingRequired: boolean;
  bookingHandledBy: BookingHandledBy | null;
  bookingDeadlineRule: string | null;
  bookingLocksParticipant: boolean;
  cancellationPolicy: string | null;
  settlementMode: "NONE" | "PLATFORM_PREPAID" | "PLATFORM_POSTPAID";
  subsidyRate: number | null;
  subsidyCap: number | null;
  requiresUserTransferToPlatform: boolean;
  summaryText: string;
  detailRules: string[];
  displayOrder: number;
};

const readErrorMessage = async (
  response: Response,
  fallback: string,
): Promise<string> => {
  const payload = (await response.json()) as { error?: string };
  return payload.error || fallback;
};

export const useAdminBookingSupportConfig = (
  eventId: Ref<number | null>,
  enabled?: Ref<boolean>,
) => {
  const queryKey = computed(() => queryKeys.admin.bookingSupport(eventId.value));

  return useQuery<AdminBookingSupportConfigResponse>({
    queryKey,
    queryFn: async () => {
      const id = eventId.value;
      if (id === null) {
        throw new Error("缺少活动 ID");
      }

      const res = await adminClient.api.admin.events[":eventId"][
        "booking-support-resources"
      ].$get({
        param: { eventId: id.toString() },
      });

      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "获取预订与资助配置失败"));
      }

      return await res.json();
    },
    enabled: () => eventId.value !== null && (enabled?.value ?? true),
  });
};

export const useReplaceEventBookingSupportResources = () => {
  const queryClient = useQueryClient();

  return useMutation<
    ReplaceEventBookingSupportResourcesResponse,
    Error,
    { eventId: number; resources: EventSupportResourceInput[] }
  >({
    mutationFn: async ({ eventId, resources }) => {
      const res = await adminClient.api.admin.events[":eventId"][
        "booking-support-resources"
      ].$put({
        param: { eventId: eventId.toString() },
        json: { resources },
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res, "保存活动资助配置失败"));
      }
      return await res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.admin.bookingSupport(variables.eventId),
      });
    },
  });
};
