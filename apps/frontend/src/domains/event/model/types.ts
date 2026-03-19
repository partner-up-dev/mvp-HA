import type { InferResponseType } from "hono";
import { client } from "@/lib/rpc";

export type AnchorEventListResponse = InferResponseType<
  (typeof client.api.events)["$get"]
>;

export type AnchorEventListItem = AnchorEventListResponse[number];

export type AnchorEventDetailResponse = InferResponseType<
  (typeof client.api.events)[":eventId"]["$get"]
>;

export type AnchorEventBatch = AnchorEventDetailResponse["batches"][number];

export type AnchorEventBatchPR = AnchorEventBatch["prs"][number];
