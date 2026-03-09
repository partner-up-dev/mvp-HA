import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

export type CommunityPRDetailView = InferResponseType<
  (typeof client.api.cpr)[":id"]["$get"]
>;

export type AnchorPRDetailView = InferResponseType<
  (typeof client.api.apr)[":id"]["$get"]
>;

export type AnchorPRBookingSupportView = InferResponseType<
  (typeof client.api.apr)[":id"]["booking-support"]["$get"]
>;

export type PRDetailView = CommunityPRDetailView | AnchorPRDetailView;

export type PRFormFields = Omit<PartnerRequestFields, "budget"> & {
  budget?: PartnerRequestFields["budget"];
};

export type CommunityPRFormFields = PartnerRequestFields;
export type AnchorPRFormFields = Omit<PRFormFields, "budget">;

const cloneTimeWindow = (
  time: PartnerRequestFields["time"],
): PartnerRequestFields["time"] => [time[0], time[1]];

export const toCommunityPRFields = (
  fields: PRFormFields,
): CommunityPRFormFields => ({
  title: fields.title,
  type: fields.type,
  time: cloneTimeWindow(fields.time),
  location: fields.location,
  minPartners: fields.minPartners,
  maxPartners: fields.maxPartners,
  partners: [...fields.partners],
  budget: fields.budget ?? null,
  preferences: [...fields.preferences],
  notes: fields.notes,
});

export const toAnchorPRFields = (
  fields: PRFormFields,
): AnchorPRFormFields => ({
  title: fields.title,
  type: fields.type,
  time: cloneTimeWindow(fields.time),
  location: fields.location,
  minPartners: fields.minPartners,
  maxPartners: fields.maxPartners,
  partners: [...fields.partners],
  preferences: [...fields.preferences],
  notes: fields.notes,
});

export const isCommunityPRDetail = (
  value: PRDetailView,
): value is CommunityPRDetailView => value.prKind === "COMMUNITY";

export const isAnchorPRDetail = (
  value: PRDetailView,
): value is AnchorPRDetailView => value.prKind === "ANCHOR";
