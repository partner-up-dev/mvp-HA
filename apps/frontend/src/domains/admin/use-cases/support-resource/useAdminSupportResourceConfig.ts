import type { Ref } from "vue";
import {
  type AdminBookingSupportConfigResponse,
  type EventSupportResourceInput,
  useAdminBookingSupportConfig,
  useReplaceEventBookingSupportResources,
} from "@/domains/admin/queries/useAdminBookingSupport";

type AdminConfig = NonNullable<AdminBookingSupportConfigResponse>;
export type AdminSupportResourceRecord = AdminConfig["resources"][number];
export type EditableSupportResource = EventSupportResourceInput & {
  detailRulesText: string;
};

export const bookingHandledByOptions = [
  "PLATFORM",
  "PLATFORM_PASSTHROUGH",
  "USER",
] as const;

export const toEditableSupportResource = (
  resource: AdminSupportResourceRecord,
): EditableSupportResource => ({
  code: resource.code,
  title: resource.title,
  resourceKind: resource.resourceKind,
  appliesToAllLocations: resource.appliesToAllLocations,
  locationIds: [...resource.locationIds],
  bookingRequired: resource.bookingRequired,
  bookingHandledBy: resource.bookingHandledBy,
  bookingDeadlineRule: resource.bookingDeadlineRule ?? null,
  bookingLocksParticipant: resource.bookingLocksParticipant,
  cancellationPolicy: resource.cancellationPolicy ?? null,
  settlementMode: resource.settlementMode,
  subsidyRate: resource.subsidyRate ?? null,
  subsidyCap: resource.subsidyCap ?? null,
  requiresUserTransferToPlatform: resource.requiresUserTransferToPlatform,
  summaryText: resource.summaryText,
  detailRules: [...resource.detailRules],
  joinGateConfig: resource.joinGateConfig,
  detailRulesText: resource.detailRules.join("\n"),
  displayOrder: resource.displayOrder,
});

export const createEmptySupportResource = (
  displayOrder: number,
): EditableSupportResource => ({
  code: "",
  title: "",
  resourceKind: "ITEM",
  appliesToAllLocations: true,
  locationIds: [],
  bookingRequired: false,
  bookingHandledBy: null,
  bookingDeadlineRule: null,
  bookingLocksParticipant: false,
  cancellationPolicy: null,
  settlementMode: "NONE",
  subsidyRate: null,
  subsidyCap: null,
  requiresUserTransferToPlatform: false,
  summaryText: "",
  detailRules: [],
  joinGateConfig: [],
  detailRulesText: "",
  displayOrder,
});

const splitDetailRules = (value: string): string[] =>
  value
    .split("\n")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

export const buildSupportResourceInputs = (
  resources: readonly EditableSupportResource[],
  resolveLocations: (locationIds: string[]) => string[],
): EventSupportResourceInput[] =>
  resources.map((resource) => ({
    code: resource.code.trim(),
    title: resource.title.trim(),
    resourceKind: resource.resourceKind,
    appliesToAllLocations: resource.appliesToAllLocations,
    locationIds: resource.appliesToAllLocations
      ? []
      : resolveLocations(resource.locationIds),
    bookingRequired: resource.bookingRequired,
    bookingHandledBy: resource.bookingRequired ? resource.bookingHandledBy : null,
    bookingDeadlineRule: resource.bookingRequired
      ? resource.bookingDeadlineRule?.trim() || null
      : null,
    bookingLocksParticipant: resource.bookingLocksParticipant,
    cancellationPolicy: resource.cancellationPolicy?.trim() || null,
    settlementMode: resource.settlementMode,
    subsidyRate: resource.subsidyRate ?? null,
    subsidyCap: resource.subsidyCap ?? null,
    requiresUserTransferToPlatform: resource.requiresUserTransferToPlatform,
    summaryText: resource.summaryText.trim(),
    detailRules: splitDetailRules(resource.detailRulesText),
    joinGateConfig: resource.joinGateConfig,
    displayOrder: resource.displayOrder,
  }));

export const useAdminSupportResourceConfig = (
  eventId: Ref<number | null>,
  enabled?: Ref<boolean>,
) => {
  const configQuery = useAdminBookingSupportConfig(eventId, enabled);
  const replaceResourcesMutation = useReplaceEventBookingSupportResources();

  const replaceResources = async ({
    eventId: targetEventId,
    resources,
  }: {
    eventId: number;
    resources: EventSupportResourceInput[];
  }) =>
    await replaceResourcesMutation.mutateAsync({
      eventId: targetEventId,
      resources,
    });

  const reset = () => {
    replaceResourcesMutation.reset();
  };

  return {
    configQuery,
    replaceResources,
    isPending: {
      replaceResources: replaceResourcesMutation.isPending,
    },
    errors: {
      replaceResources: replaceResourcesMutation.error,
    },
    reset,
  };
};
