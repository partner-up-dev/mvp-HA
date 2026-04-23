import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

type CanonicalPRDetail = InferResponseType<(typeof client.api.pr)[":id"]["$get"]>;

export type CommunityPRDetail = Extract<
  CanonicalPRDetail,
  { prKind: "COMMUNITY" }
>;

export type AnchorPRDetail = Extract<
  CanonicalPRDetail,
  { prKind: "ANCHOR" }
>;

export type ScenarioPRDetail = CommunityPRDetail | AnchorPRDetail;

export type AnchorPRBookingSupportDetail = InferResponseType<
  (typeof client.api.pr)[":id"]["booking-support"]["$get"]
>;
