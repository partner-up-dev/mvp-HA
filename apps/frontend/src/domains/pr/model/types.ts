import type { PartnerRequestFields } from "@partner-up-dev/backend";
import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

type CanonicalPRDetailView = InferResponseType<(typeof client.api.pr)[":id"]["$get"]>;

export type CommunityPRDetailView = CanonicalPRDetailView;
export type AnchorPRDetailView = CanonicalPRDetailView;
export type PRPartnerSectionView = CanonicalPRDetailView["partnerSection"];
export type PRScenario = "ANCHOR" | "COMMUNITY";

export type AnchorPRBookingSupportView = InferResponseType<
  (typeof client.api.pr)[":id"]["booking-support"]["$get"]
>;

export type AnchorPRSearchView = InferResponseType<
  (typeof client.api.pr)["search"]["$get"]
>;

export type AnchorPRSearchResult = AnchorPRSearchView["results"][number];

export type PRDetailView = CanonicalPRDetailView;

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

export const resolvePRScenario = (
  value: PRDetailView | undefined,
): PRScenario => (value?.partnerSection.reminder.supported ? "ANCHOR" : "COMMUNITY");
