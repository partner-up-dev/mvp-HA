import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

type CanonicalPRDetail = InferResponseType<(typeof client.api.pr)[":id"]["$get"]>;

export type PRDetail = CanonicalPRDetail;
export type CommunityPRDetail = CanonicalPRDetail;
export type AnchorPRDetail = CanonicalPRDetail;
export type ScenarioPRDetail = CanonicalPRDetail;

export type AnchorPRBookingSupportDetail = InferResponseType<
  (typeof client.api.pr)[":id"]["booking-support"]["$get"]
>;
