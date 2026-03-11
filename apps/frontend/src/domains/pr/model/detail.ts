import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

export type CommunityPRDetail = InferResponseType<
  (typeof client.api.cpr)[":id"]["$get"]
>;

export type AnchorPRDetail = InferResponseType<
  (typeof client.api.apr)[":id"]["$get"]
>;

export type ScenarioPRDetail = CommunityPRDetail | AnchorPRDetail;

export type AnchorPRBookingSupportDetail = InferResponseType<
  (typeof client.api.apr)[":id"]["booking-support"]["$get"]
>;
